<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { MarkingProgressVO } from '@/apis/mark/exam-progress'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam-template'
import type { ImageLedgerDetailVO } from '@/apis/mark/image-ledger'
import type {
  AllocationUnitCode,
  AnonymityModeCode,
  AnonymousTokenPolicyCode,
  ExamAllocationPlanPreviewVO,
  ExamAllocationPlanRequest,
  ExamAllocationPlanVO,
  FormalSessionVO,
  MarkingAllocationModeCode,
  MarkingOrganizationVO,
  QuestionMarkingGroupVO,
} from '@/apis/mark/marking-organization'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import type { SignalMetric } from '@/types/workbench'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import DeploymentUnitOutlined from '@ant-design/icons-vue/DeploymentUnitOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getExamDetail,
} from '@/apis/mark/exam'
import {
  getMarkingProgress,
} from '@/apis/mark/exam-progress'
import {
  getExamTemplate,
  isPaperTemplateNotConfiguredError,
} from '@/apis/mark/exam-template'
import { getImageLedgerDetail, normalizeImageLedgerDetail } from '@/apis/mark/image-ledger'
import {
  ALLOCATION_UNIT_LABEL,
  ALLOCATION_UNIT_OPTIONS,
  ANONYMITY_MODE_OPTIONS,
  ANONYMOUS_TOKEN_POLICY_OPTIONS,
  FORMAL_SESSION_STATUS_LABEL,
  FORMAL_SESSION_STATUS_TONE,
  getOrganization,
  isMarkingOrgNotCreatedError,
  listFormalSessions,
  MARKING_ALLOCATION_MODE_LABEL,
  MARKING_ORGANIZATION_STATUS_LABEL,
  MARKING_ORGANIZATION_STATUS_TONE,
  planAllocation,
  previewAllocationPlan,
  QUESTION_GROUP_STATUS_LABEL,
  QUESTION_GROUP_STATUS_TONE,
  startFormalSession,
  validateFormalSessionContract,
  validateMarkingOrganizationContract,
} from '@/apis/mark/marking-organization'
import { teacherCatalogApi } from '@/apis/quality/user-catalog'
import TeacherSelector from '@/components/quality/selectors/TeacherSelector.vue'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceReviewAssignment' })

interface AllocationForm {
  leaderUserId: string | null
  anonymityMode: AnonymityModeCode
  allocationUnit: AllocationUnitCode
  allocationMode: MarkingAllocationModeCode
  questionTemplateIds: string[]
  reviewerUserIds: string[]
  batchSize: number
  loadLimit: number
  anonymousTokenPolicy: AnonymousTokenPolicyCode
  randomQuestionSampleSize: number | null
  dualReviewEnabled: boolean
  arbitrationScoreThreshold: number | null
  arbitrationRatioThreshold: number | null
  arbitratorUserId: string | null
  remark: string
}

type SwitchCheckedValue = boolean | string | number
type NumberInputValue = string | number

const router = useRouter()
const userStore = useUserStore()
const { selectedExamId, selectedExamLabel } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const examCreateUserId = ref('')

async function loadExamOwnership(): Promise<void> {
  if (!selectedExamId.value) {
    examCreateUserId.value = ''
    return
  }
  try {
    const detail = await getExamDetail(selectedExamId.value)
    examCreateUserId.value = detail.createUser
  } catch {
    examCreateUserId.value = ''
  }
}

const canManageExam = computed(
  () =>
    !!examCreateUserId.value && examCreateUserId.value === userStore.userInfo.userId,
)

function guardExamOwnerAction(): boolean {
  if (canManageExam.value) return true
  message.warning('仅考试创建人可配置分派方案')
  return false
}

function goBackToOrganization(): void {
  void router.push({
    name: 'TeacherExamWorkspaceMarkingOrg',
    params: selectedExamId.value ? { examId: selectedExamId.value } : {},
  })
}

const templateLoading = ref(false)
const scanReadinessLoading = ref(false)
const submitting = ref(false)
const previewLoading = ref(false)
const starting = ref(false)
const questions = ref<ExamQuestionTemplateVO[]>([])
const teacherOptions = ref<TeacherUserInfoDto[]>([])
const teacherLoading = ref(false)
const result = ref<ExamAllocationPlanVO | null>(null)
const planPreview = ref<ExamAllocationPlanPreviewVO | null>(null)
const ledgerDetail = ref<ImageLedgerDetailVO | null>(null)
const markingProgress = ref<MarkingProgressVO | null>(null)

const organization = ref<MarkingOrganizationVO | null>(null)
const organizationLoading = ref(false)
const formalSessions = ref<FormalSessionVO[]>([])

const readOnlyGroupColumns: ColumnType<QuestionMarkingGroupVO>[] = [
  { title: '题组名称', dataIndex: 'groupName', key: 'groupName', width: 200 },
  { title: '负责题目', key: 'questions', width: 260 },
  { title: '阅卷教师', key: 'reviewers', width: 220 },
  { title: '题组组长', key: 'leader', width: 160 },
  { title: '状态', key: 'groupStatus', width: 100 },
]

const readOnlySessionColumns: ColumnType<FormalSessionVO>[] = [
  { title: '题组', dataIndex: 'groupName', key: 'groupName', width: 180 },
  { title: '批阅单元', key: 'allocationUnit', width: 120 },
  { title: '题目范围', key: 'questionScopes', width: 280 },
  { title: '任务进度', key: 'taskProgress', width: 200 },
  { title: '成绩闭环', key: 'gradeClosure', width: 200 },
  { title: '会话状态', key: 'sessionStatus', width: 120 },
  { title: '开始时间', key: 'startTime', width: 170 },
]

const collabSignalMetrics = computed<SignalMetric[]>(() => {
  const org = organization.value
  if (!org) return []
  const groupCount = org.groups.length
  const activeSessions = formalSessions.value.filter((s) => s.sessionStatus === 'SESSION_ACTIVE')
  return [
    { key: 'groups', label: '题组数', value: groupCount, tone: groupCount > 0 ? 'blue' : 'orange' },
    {
      key: 'sessions',
      label: '正评会话',
      value: formalSessions.value.length,
      tone: activeSessions.length > 0 ? 'green' : 'gray',
    },
    {
      key: 'anonymous',
      label: '匿名阅卷',
      value: org.anonymousMode ? '已启用' : '关闭',
      tone: org.anonymousMode ? 'green' : 'gray',
    },
  ]
})

const form = reactive<AllocationForm>({
  leaderUserId: userStore.userInfo.userId || null,
  anonymityMode: 'NAMED',
  allocationUnit: 'WHOLE_PAPER',
  allocationMode: 'BY_PAPER_RANDOM',
  questionTemplateIds: [],
  reviewerUserIds: [],
  batchSize: 20,
  loadLimit: 80,
  anonymousTokenPolicy: 'NONE',
  randomQuestionSampleSize: null,
  dualReviewEnabled: false,
  arbitrationScoreThreshold: null,
  arbitrationRatioThreshold: null,
  arbitratorUserId: null,
  remark: '',
})

const allocationUnitOptions = ALLOCATION_UNIT_OPTIONS
const anonymityModeOptions = ANONYMITY_MODE_OPTIONS
const anonymousTokenPolicyOptions = ANONYMOUS_TOKEN_POLICY_OPTIONS

const allocationModeOptions = computed(() => {
  const allowed: MarkingAllocationModeCode[]
    = form.allocationUnit === 'WHOLE_PAPER'
      ? ['BY_PAPER_RANDOM']
      : ['BY_QUESTION', 'ROUND_ROBIN', 'RANDOM', 'BY_CLASS']
  return allowed.map((value) => ({
    value,
    label: allocationModeLabel(value),
  }))
})

const canStartFormal = computed(
  () => Boolean(result.value?.sessionId) && Boolean(planPreview.value?.ready) && !starting.value,
)

const questionOptions = computed(() =>
  questions.value.map((item) => ({
    value: item.questionTemplateId,
    label: formatQuestionLabel(item),
  })),
)

const selectedQuestions = computed(() =>
  questions.value.filter((item) => form.questionTemplateIds.includes(item.questionTemplateId)),
)

const canSubmit = computed(
  () =>
    Boolean(selectedExamId.value)
    && Boolean(form.leaderUserId)
    && form.reviewerUserIds.length > 0
    && dualReviewContractValid.value
    && questionScopeValid.value
    && form.batchSize > 0
    && form.loadLimit > 0
    && !templateLoading.value,
)

const questionScopeValid = computed(() => {
  if (form.allocationUnit === 'WHOLE_PAPER') {
    return true
  }
  if (form.allocationUnit === 'SELECTED_QUESTIONS') {
    return form.questionTemplateIds.length > 0
  }
  return (
    form.questionTemplateIds.length > 0
    && form.randomQuestionSampleSize !== null
    && form.randomQuestionSampleSize > 0
    && form.randomQuestionSampleSize <= form.questionTemplateIds.length
  )
})

const dualReviewContractValid = computed(() => {
  if (!form.dualReviewEnabled) {
    return (
      form.arbitrationScoreThreshold === null
      && form.arbitrationRatioThreshold === null
      && form.arbitratorUserId === null
    )
  }
  return (
    form.allocationUnit === 'WHOLE_PAPER'
    && form.allocationMode === 'BY_PAPER_RANDOM'
    && form.reviewerUserIds.length >= 2
    && Boolean(form.arbitratorUserId)
    && !form.reviewerUserIds.includes(String(form.arbitratorUserId))
    && (form.arbitrationScoreThreshold !== null || form.arbitrationRatioThreshold !== null)
  )
})

const allocationPreview = computed(() => {
  if (!selectedExamId.value || !form.leaderUserId) {
    return null
  }
  const leader = teacherOptions.value.find((item) => item.id === form.leaderUserId)
  const reviewerNames = form.reviewerUserIds.map((reviewerUserId) => {
    const reviewer = teacherOptions.value.find((item) => item.id === reviewerUserId)
    return reviewer ? teacherDisplayName(reviewer) : '已选择教师'
  })
  return {
    examName: selectedExamLabel.value,
    leaderName: leader ? teacherDisplayName(leader) : '已选择负责人',
    allocationUnitName: allocationUnitLabel(form.allocationUnit),
    allocationModeName: allocationModeLabel(form.allocationMode),
    reviewerNames,
    arbitratorName: form.arbitratorUserId
      ? teacherDisplayNameById(form.arbitratorUserId)
      : '未选择仲裁教师',
    dualReviewRule: form.dualReviewEnabled ? formatDualReviewRule() : '未开启双评',
    questionScope:
      form.allocationUnit === 'WHOLE_PAPER'
        ? '整卷批阅'
        : selectedQuestions.value.map((item) => formatQuestionLabel(item)).join('、'),
  }
})

watch(selectedExamId, async () => {
  result.value = null
  planPreview.value = null
  form.questionTemplateIds = []
  organization.value = null
  formalSessions.value = []
  if (!selectedExamId.value) {
    examCreateUserId.value = ''
    return
  }
  await loadExamOwnership()
  if (canManageExam.value) {
    await Promise.all([loadExamQuestions(), loadScanReadiness()])
    return
  }
  await Promise.all([loadCollaboratorOrganization(), loadScanReadiness()])
}, { immediate: true })

watch(
  () => form.allocationUnit,
  (unit) => {
    result.value = null
    if (unit === 'WHOLE_PAPER') {
      form.allocationMode = 'BY_PAPER_RANDOM'
      form.questionTemplateIds = []
      form.randomQuestionSampleSize = null
      return
    }
    form.dualReviewEnabled = false
    form.arbitrationScoreThreshold = null
    form.arbitrationRatioThreshold = null
    form.arbitratorUserId = null
    if (form.allocationMode === 'BY_PAPER_RANDOM') {
      form.allocationMode = 'BY_QUESTION'
    }
  },
)

watch(
  () => form.anonymityMode,
  (mode) => {
    if (mode === 'NAMED' && form.anonymousTokenPolicy !== 'NONE') {
      form.anonymousTokenPolicy = 'NONE'
    }
    if (mode === 'ANONYMOUS' && form.anonymousTokenPolicy === 'NONE') {
      form.anonymousTokenPolicy = 'PER_EXAM'
    }
  },
)

async function loadExamQuestions(): Promise<void> {
  questions.value = []
  if (!selectedExamId.value) {
    return
  }
  templateLoading.value = true
  try {
    const template = await getExamTemplate(selectedExamId.value)
    questions.value = template.questions
  } catch (error) {
    if (error instanceof Error && isPaperTemplateNotConfiguredError(error)) {
    showUserError(error, '当前考试尚未配置有效试卷模板，不能生成真实阅卷任务')
      return
    }
    showUserError(error, '试卷题目加载失败，不能生成真实阅卷任务')
  } finally {
    templateLoading.value = false
  }
}

async function loadTeachers(keyword?: string): Promise<void> {
  teacherLoading.value = true
  try {
    const page = await teacherCatalogApi.userList({
      pageNum: 1,
      pageSize: 80,
      searchText: keyword || undefined,
      roleKey: 'SCH_TECH',
    })
    teacherOptions.value = readPageList(page, '教师列表加载失败，请稍后重试')
  } catch (error) {
    showUserError(error, '教师列表加载失败')
  } finally {
    teacherLoading.value = false
  }
}

let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null
function handleTeacherSearch(value: string): void {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value)
  }, 300)
}

function handleReviewerChange(value: SelectValue): void {
  form.reviewerUserIds = Array.isArray(value) ? value.map(String) : []
  if (form.arbitratorUserId && form.reviewerUserIds.includes(form.arbitratorUserId)) {
    form.arbitratorUserId = null
  }
}

function handleRandomQuestionSampleSizeChange(value: NumberInputValue): void {
  form.randomQuestionSampleSize = Number(value)
}

function handleArbitratorChange(value: SelectValue): void {
  if (Array.isArray(value)) {
    message.error('仲裁教师选择器配置异常，请刷新页面后重试')
    return
  }
  form.arbitratorUserId = value === undefined ? null : String(value)
}

function handleArbitrationScoreThresholdChange(value: NumberInputValue): void {
  form.arbitrationScoreThreshold = Number(value)
}

function handleArbitrationRatioThresholdChange(value: NumberInputValue): void {
  form.arbitrationRatioThreshold = Number(value)
}

function handleDualReviewChange(checked: SwitchCheckedValue): void {
  if (typeof checked !== 'boolean') {
    message.error('整卷双评开关状态异常，请刷新页面后重试')
    return
  }
  form.dualReviewEnabled = checked
  if (!checked) {
    form.arbitrationScoreThreshold = null
    form.arbitrationRatioThreshold = null
    form.arbitratorUserId = null
    return
  }
  form.allocationUnit = 'WHOLE_PAPER'
  form.allocationMode = 'BY_PAPER_RANDOM'
  form.questionTemplateIds = []
  form.randomQuestionSampleSize = null
}

function selectAllQuestions(): void {
  form.questionTemplateIds = questions.value.map((item) => item.questionTemplateId)
}

function clearSelectedQuestions(): void {
  form.questionTemplateIds = []
  form.randomQuestionSampleSize = null
}

async function loadCollaboratorOrganization(): Promise<void> {
  if (!selectedExamId.value || canManageExam.value) {
    organization.value = null
    formalSessions.value = []
    return
  }
  organizationLoading.value = true
  try {
    const nextOrganization = await getOrganization({ examId: selectedExamId.value })
    validateMarkingOrganizationContract(nextOrganization)
    organization.value = nextOrganization
    const sessions = await listFormalSessions({ organizationId: nextOrganization.id })
    sessions.forEach(validateFormalSessionContract)
    formalSessions.value = sessions
  } catch (error) {
    organization.value = null
    formalSessions.value = []
    if (error instanceof Error && isMarkingOrgNotCreatedError(error)) {
      return
    }
    showUserError(error, '阅卷组织加载失败')
  } finally {
    organizationLoading.value = false
  }
}

function formatGroupQuestions(group: QuestionMarkingGroupVO): string {
  if (group.questions.length === 0) {
    return '-'
  }
  return group.questions.map((q) => `题 ${q.questionNo}`).join('、')
}

function formatGroupReviewers(group: QuestionMarkingGroupVO): string {
  if (group.reviewers.length === 0) {
    return '-'
  }
  return group.reviewers
    .map((r) => (r.reviewerTeacherNo ? `${r.reviewerUserName}（${r.reviewerTeacherNo}）` : r.reviewerUserName))
    .join('、')
}

function goOrganizationDetailReadOnly(): void {
  if (!organization.value) {
    return
  }
  void router.push({
    name: 'TeacherMarkingOrganizationDetail',
    params: { organizationId: organization.value.id },
  })
}

async function loadScanReadiness(): Promise<void> {
  ledgerDetail.value = null
  markingProgress.value = null
  if (!selectedExamId.value) {
    return
  }
  scanReadinessLoading.value = true
  try {
    const [ledger, progress] = await Promise.all([
      getImageLedgerDetail({ examId: selectedExamId.value }),
      getMarkingProgress(selectedExamId.value),
    ])
    ledgerDetail.value = normalizeImageLedgerDetail(ledger)
    markingProgress.value = progress
  } catch (error) {
    showUserError(error, '扫描就绪状态加载失败')
  } finally {
    scanReadinessLoading.value = false
  }
}

async function loadPlanPreview(): Promise<void> {
  if (!selectedExamId.value || !form.leaderUserId || !canSubmit.value) {
    message.error('请补齐分配合同字段后再预览')
    return
  }
  previewLoading.value = true
  try {
    planPreview.value = await previewAllocationPlan(
      buildRequest(selectedExamId.value, form.leaderUserId),
    )
  } catch (error) {
    planPreview.value = null
    showUserError(error, '分配预览失败')
  } finally {
    previewLoading.value = false
  }
}

async function submitAllocation(): Promise<void> {
  if (!guardExamOwnerAction()) return
  if (!selectedExamId.value || !form.leaderUserId) {
    message.error('请选择考试和阅卷负责人')
    return
  }
  if (!canSubmit.value) {
    message.error('请补齐分配合同字段后再提交')
    return
  }
  submitting.value = true
  try {
    result.value = await planAllocation(buildRequest(selectedExamId.value, form.leaderUserId))
    planPreview.value = await previewAllocationPlan(
      buildRequest(selectedExamId.value, form.leaderUserId),
    )
    message.success('阅卷配置已保存，可在组织详情调整题组与教师后启动正评')
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '阅卷分配失败')
  } finally {
    submitting.value = false
  }
}

async function startFormalMarking(): Promise<void> {
  if (!guardExamOwnerAction()) return
  if (!result.value?.sessionId) {
    message.error('请先保存阅卷配置')
    return
  }
  if (!planPreview.value?.ready) {
    message.error(planPreview.value?.readinessMessage || '当前不满足启动正评条件')
    return
  }
  starting.value = true
  try {
    await startFormalSession(result.value.sessionId)
    planPreview.value = await previewAllocationPlan(
      buildRequest(selectedExamId.value!, form.leaderUserId!),
    )
    message.success(`正评已启动，预计生成 ${planPreview.value.expectedTaskCount ?? 0} 个阅卷任务`)
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '启动正评失败')
  } finally {
    starting.value = false
  }
}

function buildRequest(examId: string, leaderUserId: string): ExamAllocationPlanRequest {
  const request: ExamAllocationPlanRequest = {
    examId,
    leaderUserId,
    anonymityMode: form.anonymityMode,
    allocationUnit: form.allocationUnit,
    allocationMode: form.allocationMode,
    reviewerUserIds: [...form.reviewerUserIds],
    batchSize: form.batchSize,
    loadLimit: form.loadLimit,
    anonymousTokenPolicy: form.anonymousTokenPolicy,
    dualReviewEnabled: form.dualReviewEnabled,
  }
  if (form.allocationUnit !== 'WHOLE_PAPER') {
    request.questionTemplateIds = [...form.questionTemplateIds]
  }
  if (form.allocationUnit === 'RANDOM_QUESTIONS' && form.randomQuestionSampleSize !== null) {
    request.randomQuestionSampleSize = form.randomQuestionSampleSize
  }
  if (form.dualReviewEnabled) {
    if (form.arbitrationScoreThreshold !== null) {
      request.arbitrationScoreThreshold = form.arbitrationScoreThreshold
    }
    if (form.arbitrationRatioThreshold !== null) {
      request.arbitrationRatioThreshold = form.arbitrationRatioThreshold
    }
    if (form.arbitratorUserId) {
      request.arbitratorUserId = form.arbitratorUserId
    }
  }
  if (form.remark.trim()) {
    request.remark = form.remark.trim()
  }
  return request
}

function goOrganizationDetail(): void {
  if (!result.value) {
    return
  }
  void router.push({
    name: 'TeacherMarkingOrganizationDetail',
    params: { organizationId: result.value.organizationId },
  })
}

function goTaskPool(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId: selectedExamId.value } })
}

function allocationUnitLabel(value: AllocationUnitCode): string {
  return strictEnumLabel(ALLOCATION_UNIT_LABEL, value, '批阅分配单元')
}

function allocationModeLabel(value: MarkingAllocationModeCode): string {
  return strictEnumLabel(MARKING_ALLOCATION_MODE_LABEL, value, '批阅分配模式')
}

function formatSessionQuestionScope(session: FormalSessionVO): string {
  if (session.allocationUnit === 'WHOLE_PAPER') {
    return '整卷批阅'
  }
  if (!session.questionScopes.length) {
    return '待启动后固化'
  }
  const prefix = session.allocationUnit === 'RANDOM_QUESTIONS' ? '随机抽题' : '指定题目'
  const questionNos = session.questionScopes.map((scope) => {
    const progress = scope.scopedTaskCount > 0
      ? `（任务 ${scope.scopedFinalizedTaskCount}/${scope.scopedTaskCount}，成绩 ${scope.scopedConfirmedGradeCount}/${scope.scopedGradeItemCount}）`
      : ''
    return `题 ${scope.questionNo}${progress}`
  }).join('、')
  return `${prefix} ${session.questionScopeCount} 题：${questionNos}`
}

function formatSessionTaskProgress(session: FormalSessionVO): string {
  if (session.totalTaskCount <= 0) {
    return '阅卷任务待生成'
  }
  return `${session.completionScopeLabel} 已定稿 ${session.finalizedTaskCount}/${session.totalTaskCount}`
}

function formatSessionGradeClosureProgress(session: FormalSessionVO): string {
  if (session.sessionGradeItemCount <= 0) {
    return '会话成绩闭环待形成'
  }
  return `${session.sessionGradeClosureLabel} ${session.sessionConfirmedGradeCount}/${session.sessionGradeItemCount}`
}

function formatQuestionLabel(question: ExamQuestionTemplateVO): string {
  return `题 ${question.questionNo} · ${question.fullScore} 分`
}

function teacherDisplayName(teacher: TeacherUserInfoDto): string {
  return [
    teacher.nickName,
    teacher.teacherNumber ? `(${teacher.teacherNumber})` : '',
    teacher.department,
  ]
    .filter(Boolean)
    .join(' ')
}

function teacherDisplayNameById(userId: string): string {
  const teacher = teacherOptions.value.find((item) => item.id === userId)
  return teacher ? teacherDisplayName(teacher) : '已选择教师'
}

function formatDualReviewRule(): string {
  const rules: string[] = []
  if (form.arbitrationScoreThreshold !== null) {
    rules.push(`总分差超过 ${form.arbitrationScoreThreshold} 分`)
  }
  if (form.arbitrationRatioThreshold !== null) {
    rules.push(`总分差比例超过 ${form.arbitrationRatioThreshold}`)
  }
  return rules.length > 0 ? rules.join('，') : '未配置仲裁阈值'
}

onMounted(async () => {
  await loadTeachers()
})
</script>

<template>
  <div class="review-assignment-page">
    <div class="review-assignment-page__toolbar">
      <UiButton variant="outline" size="sm" @click="goBackToOrganization">
        返回阅卷安排
      </UiButton>
      <UiButton
        v-if="canManageExam"
        variant="outline"
        size="sm"
        :loading="templateLoading"
        @click="loadExamQuestions"
      >
        <template #icon><ReloadOutlined /></template>
        刷新题目
      </UiButton>
      <UiButton
        variant="outline"
        size="sm"
        :loading="organizationLoading"
        @click="loadCollaboratorOrganization"
      >
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </div>

    <template v-if="!canManageExam">
      <a-spin :spinning="organizationLoading || scanReadinessLoading">
          v-if="!organization && !organizationLoading"
          description="暂无数据"
          class="review-assignment__empty"
        />
        <template v-else-if="organization">
          <SignalBand :metrics="collabSignalMetrics" compact class="review-assignment__signals" />
          <UiCard class="review-assignment__panel review-assignment__panel--readonly">
            <template #title>
              <ProfileOutlined />
              <span>组织全貌</span>
              <UiBadge tone="blue">{{ selectedExamLabel }}</UiBadge>
            </template>
            <a-descriptions :column="{ xs: 1, sm: 2, lg: 3 }" size="middle" bordered>
              <a-descriptions-item label="阅卷组长">
                {{ organization.leaderUserName }}（{{ organization.leaderTeacherNo }}）
              </a-descriptions-item>
              <a-descriptions-item label="组织状态">
                <UiTag
                  :tone="
                    strictEnumTone(
                      MARKING_ORGANIZATION_STATUS_TONE,
                      organization.organizationStatus,
                      '阅卷组织状态',
                    )
                  "
                  size="sm"
                >
                  {{
                    strictEnumLabel(
                      MARKING_ORGANIZATION_STATUS_LABEL,
                      organization.organizationStatus,
                      '阅卷组织状态',
                    )
                  }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="匿名阅卷">
                <UiTag :tone="organization.anonymousMode ? 'green' : 'gray'" size="sm">
                  {{ organization.anonymousMode ? '启用' : '关闭' }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="题组数量">
                {{ organization.groups.length }} 组
              </a-descriptions-item>
              <a-descriptions-item label="更新时间">
                {{ formatDateTime(organization.updateTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">
                {{ organization.remark || '-' }}
              </a-descriptions-item>
            </a-descriptions>
            <div class="review-assignment__readonly-actions">
              <UiButton size="sm" @click="goOrganizationDetailReadOnly">查看题组与策略</UiButton>
              <UiButton size="sm" variant="outline" @click="goTaskPool">进入阅卷任务池</UiButton>
            </div>
          </UiCard>
          <UiCard class="review-assignment__panel review-assignment__panel--readonly">
            <template #title>
              <TeamOutlined />
              <span>题组与阅卷教师</span>
            </template>
            <UiEmpty v-if="organization.groups.length === 0" description="暂无数据" />
            <UiDataTable
              pagination-mode="none"
              v-else
              :columns="readOnlyGroupColumns"
              :data-source="organization.groups"
              :show-pagination="false"
              :total="organization.groups.length"
              row-key="id"
              size="middle"
              flat
            >
              <template #bodyCell="{ column, record: group }">
                <template v-if="column.key === 'questions'">
                  {{ formatGroupQuestions(group as QuestionMarkingGroupVO) }}
                </template>
                <template v-else-if="column.key === 'reviewers'">
                  {{ formatGroupReviewers(group as QuestionMarkingGroupVO) }}
                </template>
                <template v-else-if="column.key === 'leader'">
                  {{ group.leaderUserName }}（{{ group.leaderTeacherNo }}）
                </template>
                <template v-else-if="column.key === 'groupStatus'">
                  <UiTag
                    :tone="
                      strictEnumTone(
                        QUESTION_GROUP_STATUS_TONE,
                        group.groupStatus,
                        '题组状态',
                      )
                    "
                    size="sm"
                  >
                    {{
                      strictEnumLabel(
                        QUESTION_GROUP_STATUS_LABEL,
                        group.groupStatus,
                        '题组状态',
                      )
                    }}
                  </UiTag>
                </template>
              </template>
            </UiDataTable>
          </UiCard>
          <UiCard
            v-if="formalSessions.length > 0"
            class="review-assignment__panel review-assignment__panel--readonly"
          >
            <template #title>
              <DeploymentUnitOutlined />
              <span>正评会话</span>
            </template>
            <UiDataTable
              pagination-mode="none"
              :columns="readOnlySessionColumns"
              :data-source="formalSessions"
              :show-pagination="false"
              :total="formalSessions.length"
              row-key="id"
              size="middle"
              flat
            >
              <template #bodyCell="{ column, record: session }">
                <template v-if="column.key === 'allocationUnit'">
                  {{ allocationUnitLabel((session as FormalSessionVO).allocationUnit) }}
                </template>
                <template v-else-if="column.key === 'questionScopes'">
                  {{ formatSessionQuestionScope(session as FormalSessionVO) }}
                </template>
                <template v-else-if="column.key === 'taskProgress'">
                  {{ formatSessionTaskProgress(session as FormalSessionVO) }}
                </template>
                <template v-else-if="column.key === 'gradeClosure'">
                  {{ formatSessionGradeClosureProgress(session as FormalSessionVO) }}
                </template>
                <template v-else-if="column.key === 'sessionStatus'">
                  <UiTag
                    :tone="
                      strictEnumTone(
                        FORMAL_SESSION_STATUS_TONE,
                        session.sessionStatus,
                        '正评会话状态',
                      )
                    "
                    size="sm"
                  >
                    {{
                      strictEnumLabel(
                        FORMAL_SESSION_STATUS_LABEL,
                        session.sessionStatus,
                        '正评会话状态',
                      )
                    }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'startTime'">
                  {{ formatDateTime(session.startTime) }}
                </template>
              </template>
            </UiDataTable>
          </UiCard>
        </template>
      </a-spin>
    </template>

    <template v-else>
      <section class="review-assignment__grid">
        <UiCard class="review-assignment__panel">
          <template #title>
            <DeploymentUnitOutlined />
            <span>考试与范围</span>
          </template>

          <a-form layout="vertical" :model="form">
            <a-form-item label="阅卷负责人" required>
              <TeacherSelector
                v-model:value="form.leaderUserId"
                placeholder="选择阅卷负责人"
                :allow-clear="false"
              />
            </a-form-item>

            <a-form-item label="批阅单元" required>
              <a-radio-group v-model:value="form.allocationUnit" button-style="solid">
                <a-radio-button
                  v-for="item in allocationUnitOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item v-if="form.allocationUnit !== 'WHOLE_PAPER'" label="题目范围" required>
              <div class="review-assignment__question-toolbar">
                <UiButton size="sm" variant="outline" @click="selectAllQuestions">
                  全选题目
                </UiButton>
                <UiButton size="sm" variant="ghost" @click="clearSelectedQuestions">清空</UiButton>
              </div>
              <a-select
                v-model:value="form.questionTemplateIds"
                mode="multiple"
                placeholder="选择进入分配的题目"
                :options="questionOptions"
                :loading="templateLoading"
                show-search
                option-filter-prop="label"
              />
            </a-form-item>

            <a-form-item
              v-if="form.allocationUnit === 'RANDOM_QUESTIONS'"
              label="随机抽样题数"
              required
            >
              <a-input-number
                :value="form.randomQuestionSampleSize ?? undefined"
                :min="1"
                :max="Math.max(form.questionTemplateIds.length, 1)"
                class="review-assignment__number"
                @change="handleRandomQuestionSampleSizeChange"
              />
              <div class="review-assignment__hint">
                启动后本次随机抽题结果会固化为正式会话范围，可在会话列表复盘。
              </div>
            </a-form-item>

            <div class="review-assignment__question-list">
              <div
                v-for="question in questions"
                :key="question.questionTemplateId"
                class="review-assignment__question-item"
              >
                <strong>{{ formatQuestionLabel(question) }}</strong>
                <span v-if="question.questionStem">{{ question.questionStem }}</span>
              </div>
            </div>
          </a-form>
        </UiCard>

        <UiCard class="review-assignment__panel">
          <template #title>
            <TeamOutlined />
            <span>教师与策略</span>
          </template>

          <a-form layout="vertical" :model="form">
            <a-form-item label="评阅教师" required>
              <a-select
                :value="form.reviewerUserIds"
                mode="multiple"
                placeholder="搜索并选择评阅教师"
                :loading="teacherLoading"
                show-search
                :filter-option="false"
                @search="handleTeacherSearch"
                @change="handleReviewerChange"
              >
                <a-select-option
                  v-for="teacher in teacherOptions"
                  :key="teacher.id"
                  :value="teacher.id"
                >
                  {{ teacherDisplayName(teacher) }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="匿名模式" required>
              <a-radio-group v-model:value="form.anonymityMode" button-style="solid">
                <a-radio-button
                  v-for="item in anonymityModeOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="匿名令牌策略" required>
              <a-select
                v-model:value="form.anonymousTokenPolicy"
                :options="anonymousTokenPolicyOptions"
              />
            </a-form-item>

            <a-form-item label="分配模式" required>
              <a-select v-model:value="form.allocationMode" :options="allocationModeOptions" />
            </a-form-item>

            <div class="review-assignment__number-row">
              <a-form-item label="每批任务数" required>
                <a-input-number
                  v-model:value="form.batchSize"
                  :min="1"
                  class="review-assignment__number"
                />
              </a-form-item>
              <a-form-item label="教师待处理上限" required>
                <a-input-number
                  v-model:value="form.loadLimit"
                  :min="1"
                  class="review-assignment__number"
                />
              </a-form-item>
            </div>

            <a-form-item label="整卷双评">
              <a-switch :checked="form.dualReviewEnabled" @change="handleDualReviewChange" />
              <span class="review-assignment__hint">
                仅支持整卷随机派发；前两轮评阅教师必须不同，仲裁教师不能参与前两轮。
              </span>
            </a-form-item>

            <template v-if="form.dualReviewEnabled">
              <a-form-item label="仲裁教师" required>
                <a-select
                  :value="form.arbitratorUserId ?? undefined"
                  placeholder="选择仲裁教师"
                  :loading="teacherLoading"
                  show-search
                  :filter-option="false"
                  allow-clear
                  @search="handleTeacherSearch"
                  @change="handleArbitratorChange"
                >
                  <a-select-option
                    v-for="teacher in teacherOptions"
                    :key="teacher.id"
                    :value="teacher.id"
                    :disabled="form.reviewerUserIds.includes(teacher.id)"
                  >
                    {{ teacherDisplayName(teacher) }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <div class="review-assignment__number-row">
                <a-form-item label="仲裁分差阈值">
                  <a-input-number
                    :value="form.arbitrationScoreThreshold ?? undefined"
                    :min="0"
                    :precision="2"
                    class="review-assignment__number"
                    placeholder="总分差"
                    @change="handleArbitrationScoreThresholdChange"
                  />
                </a-form-item>
                <a-form-item label="仲裁比例阈值">
                  <a-input-number
                    :value="form.arbitrationRatioThreshold ?? undefined"
                    :min="0"
                    :precision="4"
                    class="review-assignment__number"
                    placeholder="如 0.1"
                    @change="handleArbitrationRatioThresholdChange"
                  />
                </a-form-item>
              </div>
              <span class="review-assignment__hint">
                两个阈值至少填写一个；命中任一阈值即进入仲裁。
              </span>
            </template>

            <a-form-item label="备注">
              <a-textarea
                v-model:value="form.remark"
                :rows="3"
                placeholder="填写本次分配说明"
                :maxlength="200"
                show-count
              />
            </a-form-item>
          </a-form>
        </UiCard>

        <UiCard class="review-assignment__panel review-assignment__panel--summary">
          <template #title>
            <SettingOutlined />
            <span>分配摘要</span>
          </template>

          <dl v-if="allocationPreview" class="review-assignment__summary">
            <div>
              <dt>当前考试</dt>
              <dd>{{ allocationPreview.examName }}</dd>
            </div>
            <div>
              <dt>阅卷负责人</dt>
              <dd>{{ allocationPreview.leaderName }}</dd>
            </div>
            <div>
              <dt>批阅单元</dt>
              <dd>{{ allocationPreview.allocationUnitName }}</dd>
            </div>
            <div>
              <dt>分配方式</dt>
              <dd>{{ allocationPreview.allocationModeName }}</dd>
            </div>
            <div>
              <dt>评阅教师</dt>
              <dd v-if="allocationPreview.reviewerNames.length > 0">
                {{ allocationPreview.reviewerNames.join('、') }}
              </dd>
              <dd v-else>表单尚未选择评阅教师</dd>
            </div>
            <div>
              <dt>双评规则</dt>
              <dd>{{ allocationPreview.dualReviewRule }}</dd>
            </div>
            <div v-if="form.dualReviewEnabled">
              <dt>仲裁教师</dt>
              <dd>{{ allocationPreview.arbitratorName }}</dd>
            </div>
            <div>
              <dt>题目范围</dt>
              <dd>{{ allocationPreview.questionScope || '表单尚未选择题目范围' }}</dd>
            </div>
            <template v-if="planPreview">
              <div>
                <dt>已绑定答卷</dt>
                <dd>{{ planPreview.boundPaperCount }} 份</dd>
              </div>
              <div v-if="planPreview.registeredSliceCount !== undefined">
                <dt>可派发切片</dt>
                <dd>{{ planPreview.registeredSliceCount }} 个</dd>
              </div>
              <div v-if="planPreview.expectedTaskCount !== undefined">
                <dt>预计任务数</dt>
                <dd>{{ planPreview.expectedTaskCount }} 个</dd>
              </div>
              <div v-if="planPreview.coverageMessage">
                <dt>覆盖说明</dt>
                <dd>{{ planPreview.coverageMessage }}</dd>
              </div>
              <div v-if="planPreview.readinessMessage">
                <dt>启动条件</dt>
                <dd>{{ planPreview.readinessMessage }}</dd>
              </div>
            </template>
          </dl>

          <div class="review-assignment__actions">
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!canSubmit"
              :loading="previewLoading"
              @click="loadPlanPreview"
            >
              预览分配
            </UiButton>
            <UiButton
              size="sm"
              :disabled="!canSubmit"
              :loading="submitting"
              @click="submitAllocation"
            >
              保存配置
            </UiButton>
            <UiButton
              size="sm"
              :disabled="!canStartFormal"
              :loading="starting"
              @click="startFormalMarking"
            >
              启动正评
            </UiButton>
            <UiButton size="sm" variant="outline" :disabled="!selectedExamId" @click="goTaskPool">
              查看任务池
            </UiButton>
          </div>

          <div v-if="result" class="review-assignment__result">
            <CheckCircleOutlined />
            <div>
              <strong>配置已保存</strong>
              <p>
                组织 {{ result.organizationId }}，题组 {{ result.groupId }}，正评草稿会话
                {{ result.sessionId }}
              </p>
              <UiButton size="sm" variant="outline" @click="goOrganizationDetail">
                调整题组与教师
              </UiButton>
            </div>
          </div>
        </UiCard>
      </section>
    </template>
  </div>
</template>

<style scoped>
.review-assignment-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.review-assignment-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.review-assignment__context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.review-assignment__context-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-assignment__title {
  margin: 0;
  color: var(--dp-text-primary, #0f172a);
  font-size: 20px;
  font-weight: 800;
}

.review-assignment__subtitle,
.review-assignment__hint {
  color: var(--dp-text-secondary, #475569);
  font-size: 13px;
}

.review-assignment__context-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-assignment__exam-select {
  width: 360px;
}

.review-assignment__empty {
  margin-bottom: 12px;
}

.review-assignment__signals {
  margin-bottom: 16px;
}

.review-assignment__readonly-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.review-assignment__panel--readonly {
  margin-bottom: 16px;
}

.review-assignment__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(320px, 0.8fr);
  gap: 12px;
  align-items: start;
}

.review-assignment__panel {
  min-width: 0;
}

.review-assignment__question-toolbar,
.review-assignment__actions,
.review-assignment__number-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-assignment__number-row :deep(.ant-form-item) {
  flex: 1;
}

.review-assignment__number {
  width: 100%;
}

.review-assignment__question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow: auto;
}

.review-assignment__question-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control, 8px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.review-assignment__question-item span {
  overflow: hidden;
  color: var(--dp-text-secondary, #475569);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-assignment__hint {
  margin-top: 8px;
  color: var(--ant-color-warning);
  font-size: 12px;
  line-height: 1.4;
}

.review-assignment__summary {
  display: grid;
  gap: 10px;
  margin: 0 0 16px;
}

.review-assignment__summary div {
  display: grid;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
}

.review-assignment__summary dt {
  color: var(--dp-text-secondary, #475569);
  font-size: 12px;
}

.review-assignment__summary dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--dp-text-primary, #0f172a);
  font-size: 12px;
}

.review-assignment__result {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--ant-color-success-border, #b7eb8f);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--ant-color-success-bg, #f6ffed);
  color: var(--ant-color-success, #22c55e);
}

.review-assignment__result p {
  margin: 4px 0 10px;
  color: var(--dp-text-secondary, #475569);
}

@media (max-width: 1200px) {
  .review-assignment__grid {
    grid-template-columns: 1fr 1fr;
  }

  .review-assignment__panel--summary {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .review-assignment__context,
  .review-assignment__context-actions,
  .review-assignment__number-row {
    align-items: stretch;
    flex-direction: column;
  }

  .review-assignment__exam-select {
    width: 100%;
  }

  .review-assignment__grid {
    grid-template-columns: 1fr;
  }
}
</style>
