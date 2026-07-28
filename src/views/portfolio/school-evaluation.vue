<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationRereviewOrderVO } from '@/apis/portfolio/evaluation-publicity'
import type { PortfolioTenantIndicatorConfigVO } from '@/apis/portfolio/indicator-types'
import type {
  PortfolioEvaluationTaskVO,
  PortfolioEvaluationWorkgroupOptionVO,
} from '@/apis/portfolio/teacher-platform'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PORTFOLIO_EVALUATION_CLOSEABLE_STATUSES,
  PORTFOLIO_EVALUATION_MODE_OPTIONS,
  PORTFOLIO_EVALUATION_SCENE_OPTIONS,
  PORTFOLIO_EVALUATION_TASK_STATUS_TONE,
  PortfolioEvaluationModeCode,
  PortfolioEvaluationSceneCode,
  PortfolioEvaluationSceneDescription,
  PortfolioEvaluationTaskAdvanceActionCode,
  PortfolioEvaluationTaskAdvanceActionDescription,
  PortfolioEvaluationTaskStatusDescription,
  PortfolioEvaluationTaskStatusEnum,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationPublicityApi } from '@/apis/portfolio/evaluation-publicity'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import {
  portfolioEvaluationTaskApi,
  portfolioEvaluationWorkgroupApi,
} from '@/apis/portfolio/teacher-platform'
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useUserStore } from '@/stores/modules/user'
import { PfIndicatorStatusCode } from '@/types/enums/pf-indicator-status-enum'
import {
  isPortfolioEvaluationAdvanceBlockingCode,
  PortfolioEvaluationAdvanceBlockingCode,
  PortfolioEvaluationAdvanceBlockingDescription,
} from '@/types/enums/portfolio-evaluation-advance-blocking-code-enum'
import { ResultCode } from '@/types/enums/result-code'
import {
  getUserErrorMessage,
  readBusinessResultCode,
  readBusinessResultData,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { loadAllPages } from '@/utils/load-all-pages'
import { portfolioLifecycleStatusDisplay } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function readScoreVarianceBlocking(error: unknown): {
  groupCount?: number
  threshold?: string
  samples: string[]
} | null {
  if (readBusinessResultCode(error) !== ResultCode.CONFLICT) {
    return null
  }
  const data = readBusinessResultData(error)
  if (data == null || typeof data !== 'object') {
    return null
  }
  const blockingCode = Object.getOwnPropertyDescriptor(data, 'blockingCode')?.value
  if (!isPortfolioEvaluationAdvanceBlockingCode(blockingCode)
    || blockingCode !== PortfolioEvaluationAdvanceBlockingCode.SCORE_VARIANCE_EXCEEDED) {
    return null
  }
  const forceAllowed = Object.getOwnPropertyDescriptor(data, 'forceAllowed')?.value
  if (forceAllowed === false) {
    return null
  }
  const groupCountRaw = Object.getOwnPropertyDescriptor(data, 'highVarianceGroupCount')?.value
  const thresholdRaw = Object.getOwnPropertyDescriptor(data, 'scoreVarianceThreshold')?.value
  const samplesRaw = Object.getOwnPropertyDescriptor(data, 'highVarianceSamples')?.value
  return {
    groupCount: typeof groupCountRaw === 'number' ? groupCountRaw : undefined,
    threshold: thresholdRaw == null ? undefined : String(thresholdRaw),
    samples: Array.isArray(samplesRaw)
      ? samplesRaw.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

function readExpertReviewIncompleteBlocking(error: unknown): {
  incompleteExpertCount?: number
  missingPairCount?: number
  samples: string[]
} | null {
  if (readBusinessResultCode(error) !== ResultCode.CONFLICT) {
    return null
  }
  const data = readBusinessResultData(error)
  if (data == null || typeof data !== 'object') {
    return null
  }
  const blockingCode = Object.getOwnPropertyDescriptor(data, 'blockingCode')?.value
  if (!isPortfolioEvaluationAdvanceBlockingCode(blockingCode)
    || blockingCode !== PortfolioEvaluationAdvanceBlockingCode.EXPERT_REVIEW_INCOMPLETE) {
    return null
  }
  const incompleteRaw = Object.getOwnPropertyDescriptor(data, 'incompleteExpertCount')?.value
  const missingRaw = Object.getOwnPropertyDescriptor(data, 'missingExpertEvaluationPairCount')?.value
  const samplesRaw = Object.getOwnPropertyDescriptor(data, 'incompleteExpertSamples')?.value
  return {
    incompleteExpertCount: typeof incompleteRaw === 'number' ? incompleteRaw : undefined,
    missingPairCount: typeof missingRaw === 'number' ? missingRaw : undefined,
    samples: Array.isArray(samplesRaw)
      ? samplesRaw.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

function expertReviewProgressText(task: PortfolioEvaluationTaskVO): string {
  if (task.taskStatus !== PortfolioEvaluationTaskStatusEnum.EXPERT_REVIEW) {
    return ''
  }
  const active = task.activeExpertAssignmentCount
  if (active == null) {
    return ''
  }
  if (active <= 0) {
    return '无外部专家授权'
  }
  if (task.expertReviewComplete === true) {
    return `专家评审已完成（${active} 人）`
  }
  const incomplete = task.incompleteExpertCount ?? 0
  const missing = task.missingExpertEvaluationPairCount ?? 0
  return `专家未完成 ${incomplete}/${active}（缺 ${missing} 组）`
}

const ADVANCE_ACTIONS: Partial<
  Record<PortfolioEvaluationTaskStatusEnum, PortfolioEvaluationTaskAdvanceActionCode>
> = {
  [PortfolioEvaluationTaskStatusEnum.PUBLISHED]:
    PortfolioEvaluationTaskAdvanceActionCode.START_PRELIMINARY_REVIEW,
  [PortfolioEvaluationTaskStatusEnum.PRELIMINARY_REVIEW]:
    PortfolioEvaluationTaskAdvanceActionCode.START_SCHOOL_REVIEW,
  [PortfolioEvaluationTaskStatusEnum.SCHOOL_REVIEW]:
    PortfolioEvaluationTaskAdvanceActionCode.START_EXPERT_REVIEW,
  [PortfolioEvaluationTaskStatusEnum.EXPERT_REVIEW]:
    PortfolioEvaluationTaskAdvanceActionCode.START_RESULT_SUMMARY,
}

function canArchiveTask(task: PortfolioEvaluationTaskVO): boolean {
  return (
    (task.taskStatus === PortfolioEvaluationTaskStatusEnum.PUBLICITY
      || task.taskStatus === PortfolioEvaluationTaskStatusEnum.OBJECTION_HANDLING)
    && task.publicityExpiredAwaitingArchive === true
  )
}

/** 已发布后的评价周期可关闭；草稿须作废，暂停须先恢复。 */
function canCloseTask(task: PortfolioEvaluationTaskVO): boolean {
  return PORTFOLIO_EVALUATION_CLOSEABLE_STATUSES.includes(task.taskStatus)
}

function canSuspendTask(task: PortfolioEvaluationTaskVO): boolean {
  return PORTFOLIO_EVALUATION_CLOSEABLE_STATUSES.includes(task.taskStatus)
}

function advanceActionLabel(action: PortfolioEvaluationTaskAdvanceActionCode): string {
  return strictEnumLabel(
    PortfolioEvaluationTaskAdvanceActionDescription,
    action,
    '评价任务推进动作',
  )
}

function taskStatusLabel(status: PortfolioEvaluationTaskStatusEnum): string {
  return strictEnumLabel(PortfolioEvaluationTaskStatusDescription, status, '多元评价任务状态')
}

function evaluationSceneLabel(scene?: PortfolioEvaluationSceneCode | string): string {
  if (!scene) return '—'
  return strictEnumLabel(
    PortfolioEvaluationSceneDescription,
    scene as PortfolioEvaluationSceneCode,
    '评价任务场景',
  )
}

function taskStatusTone(status: PortfolioEvaluationTaskStatusEnum) {
  return strictEnumTone(PORTFOLIO_EVALUATION_TASK_STATUS_TONE, status, '多元评价任务状态')
}

const loading = ref(false)
const advancingId = ref('')
const archivingId = ref('')
const publishing = ref(false)
const requestToken = ref(0)
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
/** 租户管理员：可新建/推进；工作组成员仅可读台账与深链定位 */
const isTenantAdmin = computed(() => Boolean(userStore.isTenantAdmin))
const rows = ref<PortfolioEvaluationTaskVO[]>([])
const pageNum = ref(1)
const sceneFilter = ref<PortfolioEvaluationSceneCode | undefined>(undefined)
const pageSize = ref(10)
const pageTotal = ref(0)
/** PF-P0-293：站内信/待办 evaluationTaskId 深链高亮 */
const highlightedTaskId = ref('')
const pendingLocateTaskId = ref(
  typeof route.query.evaluationTaskId === 'string' ? route.query.evaluationTaskId.trim() : '',
)
/** 深链 CORRECTION_REVIEW 仅自动打开完成复核弹窗一次 */
const autoOpenedCompleteRereview = ref(false)
const publishModalOpen = ref(false)
const publishTarget = ref<PortfolioEvaluationTaskVO | null>(null)
const createModalOpen = ref(false)
const creating = ref(false)
const workgroupsLoading = ref(false)
const workgroupsLoadFailed = ref(false)
const workgroups = ref<PortfolioEvaluationWorkgroupOptionVO[]>([])
const indicatorConfigsLoading = ref(false)
const indicatorConfigsLoadFailed = ref(false)
const indicatorConfigs = ref<PortfolioTenantIndicatorConfigVO[]>([])
const createContextRequestToken = ref(0)
const createContextLoading = computed(
  () => workgroupsLoading.value || indicatorConfigsLoading.value,
)
const enabledIndicatorOptions = computed(() =>
  indicatorConfigs.value.map((indicator) => ({
    value: indicator.indicatorCode,
    label: indicator.indicatorName || indicator.indicatorCode,
  })),
)
const writing = computed(
  () =>
    creating.value
    || Boolean(advancingId.value)
    || Boolean(archivingId.value)
    || publishing.value
    || completeRereviewSubmitting.value
    || cancelRereviewSubmitting.value
    || completeRereviewLoading.value,
)
const publishForm = reactive({
  publicityTitle: '',
  startTime: '',
  endTime: '',
})
/** 完成更正复核：结论录入 + 开放工单批量 complete */
const completeRereviewModalOpen = ref(false)
const completeRereviewTarget = ref<PortfolioEvaluationTaskVO | null>(null)
const completeRereviewOrders = ref<PortfolioEvaluationRereviewOrderVO[]>([])
const completeRereviewLoading = ref(false)
const completeRereviewSubmitting = ref(false)
const completeRereviewForm = reactive({
  conclusionSummary: '',
  cancelReason: '',
})
const cancelRereviewSubmitting = ref(false)
const createForm = reactive({
  taskName: '',
  evaluationMode: PortfolioEvaluationModeCode.BY_INDICATOR,
  sceneCode: PortfolioEvaluationSceneCode.GENERAL,
  targetIndicatorCode: '',
  workgroupId: '',
  startTime: '',
  endTime: '',
})

const columns: ColumnsType<PortfolioEvaluationTaskVO> = [
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName', fixed: 'left' },
  { title: '场景', dataIndex: 'sceneCode', key: 'sceneCode', width: 120 },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 100 },
  { title: '时间窗', key: 'timeWindow', width: 200 },
  { title: '状态', key: 'taskStatus', width: 120 },
  { title: '操作', key: 'actions', width: 200 },
]

const expiredAwaitingArchiveTasks = computed(() =>
  rows.value.filter((row) => row.publicityExpiredAwaitingArchive === true),
)

const archiveReminderText = computed(() => {
  const tasks = expiredAwaitingArchiveTasks.value
  if (tasks.length === 0) {
    return ''
  }
  const names = tasks.map((task) => task.taskName).join('、')
  return tasks.length === 1
    ? `「${names}」公示已结束且无待复核异议，请执行归档。`
    : `${tasks.length} 个评价任务（${names}）公示已结束且无待复核异议，请逐条执行归档。`
})

function onSceneFilterChange() {
  pageNum.value = 1
  void loadPage()
}

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = {
    pageNum: pageNum.value,
    pageSize: pageSize.value,
    locateTaskId: pendingLocateTaskId.value || undefined,
    sceneCode: sceneFilter.value || undefined,
  }
  loading.value = true
  try {
    const page = await portfolioEvaluationTaskApi.page(request)
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
    pageNum.value = page.pageNum ?? pageNum.value
    pageSize.value = page.pageSize ?? pageSize.value
    // 定位仅生效一次，避免后续翻页被 locateTaskId 强拉回目标页
    const locateOnce = pendingLocateTaskId.value
    pendingLocateTaskId.value = ''
    if (locateOnce) {
      highlightedTaskId.value = locateOnce
    }
    await applyDeepLinkedTask(locateOnce)
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = []
    pageTotal.value = 0
    highlightedTaskId.value = ''
    showUserError(error, '加载评价任务失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

/** PF-P0-293：消费 evaluationTaskId 深链 — 高亮目标行；更正复核中可打开完成复核弹窗。 */
async function applyDeepLinkedTask(taskId: string) {
  if (!taskId) {
    if (!highlightedTaskId.value) {
      return
    }
    // 无新深链时保持既有高亮，仅在列表仍含目标时滚动
    if (!rows.value.some((item) => item.id === highlightedTaskId.value)) {
      return
    }
    scrollToHighlightedTask()
    return
  }
  highlightedTaskId.value = taskId
  const matched = rows.value.find((item) => item.id === taskId)
  if (!matched) {
    return
  }
  scrollToHighlightedTask()
  if (
    !autoOpenedCompleteRereview.value
    && matched.taskStatus === PortfolioEvaluationTaskStatusEnum.CORRECTION_REVIEW
  ) {
    autoOpenedCompleteRereview.value = true
    await openCompleteRereview(matched)
  }
}

function taskRowClassName(record: PortfolioEvaluationTaskVO): string {
  return record.id === highlightedTaskId.value ? 'school-evaluation__row-active' : ''
}

function scrollToHighlightedTask() {
  if (!highlightedTaskId.value) {
    return
  }
  void nextTick(() => {
    document.querySelector('.school-evaluation__row-active')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  })
}

async function openCreateModal() {
  if (writing.value) {
    return
  }
  createModalOpen.value = true
  await loadCreateContext()
}

/** 加载评价任务创建所需的启用工作组与租户已启用回流指标，任一失败均禁止提交。 */
async function loadCreateContext() {
  const currentToken = ++createContextRequestToken.value
  workgroupsLoading.value = true
  indicatorConfigsLoading.value = true
  workgroupsLoadFailed.value = false
  indicatorConfigsLoadFailed.value = false
  workgroups.value = []
  indicatorConfigs.value = []
  const [workgroupResult, indicatorResult] = await Promise.allSettled([
    loadAllPages(
      ({ pageNum, pageSize }) =>
        portfolioEvaluationWorkgroupApi.page({ pageNum, pageSize, enabled: true }),
      QUALITY_SELECTOR_PAGE_SIZE,
    ),
    portfolioIndicatorTenantApi.listConfig(),
  ])
  if (createContextRequestToken.value !== currentToken) {
    return
  }
  workgroupsLoading.value = false
  indicatorConfigsLoading.value = false
  if (workgroupResult.status === 'fulfilled') {
    workgroups.value = workgroupResult.value.filter((item) => item.enabled)
    if (
      createForm.workgroupId
      && !workgroups.value.some((item) => item.id === createForm.workgroupId)
    ) {
      createForm.workgroupId = ''
    }
  } else {
    workgroupsLoadFailed.value = true
    showUserError(workgroupResult.reason, '加载评价工作组失败')
  }
  if (indicatorResult.status === 'fulfilled') {
    indicatorConfigs.value = indicatorResult.value.filter(
      (item) => item.enabled && item.platformStatus === PfIndicatorStatusCode.ACTIVE,
    )
    if (
      createForm.targetIndicatorCode
      && !indicatorConfigs.value.some(
        (item) => item.indicatorCode === createForm.targetIndicatorCode,
      )
    ) {
      createForm.targetIndicatorCode = ''
    }
  } else {
    indicatorConfigsLoadFailed.value = true
    showUserError(indicatorResult.reason, '加载可回流指标失败')
  }
}

async function submitCreateTask() {
  if (writing.value) {
    return
  }
  if (createContextLoading.value) {
    showFormValidationMessage('评价任务创建选项仍在加载，请稍后提交')
    return
  }
  if (workgroupsLoadFailed.value) {
    showFormValidationMessage('评价工作组加载失败，请重新打开创建窗口后重试')
    return
  }
  if (
    !createForm.taskName.trim()
    || !createForm.workgroupId
    || !createForm.startTime
    || !createForm.endTime
  ) {
    showFormValidationMessage('请填写任务名称、工作组和评价时间窗')
    return
  }
  if (!workgroups.value.some((item) => item.id === createForm.workgroupId)) {
    showFormValidationMessage('所选评价工作组已停用或不存在，请重新选择')
    return
  }
  if (
    createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
    && !createForm.targetIndicatorCode.trim()
  ) {
    showFormValidationMessage('按人评价须填写画像回流目标指标编码')
    return
  }
  if (createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON) {
    if (indicatorConfigsLoadFailed.value) {
      showFormValidationMessage('可回流指标加载失败，请重新打开创建窗口后重试')
      return
    }
    if (
      !indicatorConfigs.value.some(
        (item) => item.indicatorCode === createForm.targetIndicatorCode,
      )
    ) {
      showFormValidationMessage('所选回流指标已停用或不存在，请重新选择')
      return
    }
  }
  if (createForm.startTime >= createForm.endTime) {
    showFormValidationMessage('评价结束时间必须晚于开始时间')
    return
  }
  creating.value = true
  try {
    await portfolioEvaluationTaskApi.create({
      taskName: createForm.taskName.trim(),
      evaluationMode: createForm.evaluationMode,
      sceneCode: createForm.sceneCode,
      ...(createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
        ? { targetIndicatorCode: createForm.targetIndicatorCode.trim() }
        : {}),
      workgroupId: createForm.workgroupId,
      startTime: createForm.startTime,
      endTime: createForm.endTime,
    })
    void message.success('评价任务已创建，请核对后发布')
    createModalOpen.value = false
    createForm.taskName = ''
    createForm.evaluationMode = PortfolioEvaluationModeCode.BY_INDICATOR
    createForm.sceneCode = PortfolioEvaluationSceneCode.GENERAL
    createForm.targetIndicatorCode = ''
    createForm.workgroupId = ''
    createForm.startTime = ''
    createForm.endTime = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '创建评价任务失败')
  } finally {
    creating.value = false
  }
}

function nextAction(
  status: PortfolioEvaluationTaskStatusEnum,
): PortfolioEvaluationTaskAdvanceActionCode | undefined {
  return ADVANCE_ACTIONS[status]
}

async function advanceTask(
  row: PortfolioEvaluationTaskVO,
  action: PortfolioEvaluationTaskAdvanceActionCode | undefined = nextAction(row.taskStatus),
  forceDespiteScoreVariance = false,
) {
  if (!action) {
    return
  }
  if (writing.value) {
    return
  }
  if (action === PortfolioEvaluationTaskAdvanceActionCode.VOID) {
    const confirmed = await confirmAsync({
      title: '作废评价任务',
      content: `确认作废草稿任务「${row.taskName || row.id}」？作废后不可再发布。`,
      type: 'warning',
      okText: '作废',
    })
    if (!confirmed) {
      return
    }
  }
  if (action === PortfolioEvaluationTaskAdvanceActionCode.CLOSE) {
    const confirmed = await confirmAsync({
      title: '关闭评价任务',
      content: `确认关闭「${row.taskName || row.id}」？关闭后将结束当前评价周期、同步关闭未结束公示，并通知参评教师与工作组；草稿请使用作废。`,
      type: 'warning',
      okText: '关闭',
    })
    if (!confirmed) {
      return
    }
  }
  advancingId.value = row.id
  try {
    await portfolioEvaluationPublicityApi.advanceTask({
      taskId: row.id,
      action,
      forceDespiteScoreVariance: forceDespiteScoreVariance || undefined,
    })
    void message.success(
      action === PortfolioEvaluationTaskAdvanceActionCode.CLOSE
        ? '评价任务已关闭'
        : action === PortfolioEvaluationTaskAdvanceActionCode.VOID
          ? '评价任务已作废'
          : '任务状态已推进',
    )
    await loadPage()
  } catch (error) {
    const expertIncomplete = action === PortfolioEvaluationTaskAdvanceActionCode.START_RESULT_SUMMARY
      ? readExpertReviewIncompleteBlocking(error)
      : null
    if (expertIncomplete) {
      const sampleText = expertIncomplete.samples.length
        ? `\n样例：${expertIncomplete.samples.join('；')}`
        : ''
      const expertText = expertIncomplete.incompleteExpertCount != null
        ? `${expertIncomplete.incompleteExpertCount} 名专家`
        : '部分专家'
      const missingText = expertIncomplete.missingPairCount != null
        ? `，缺 ${expertIncomplete.missingPairCount} 组评价`
        : ''
      await confirmAsync({
        title: PortfolioEvaluationAdvanceBlockingDescription[
          PortfolioEvaluationAdvanceBlockingCode.EXPERT_REVIEW_INCOMPLETE
        ],
        content:
          `${expertText}尚未完成授权范围评审${missingText}，不能进入结果汇总。${sampleText}\n\n`
          + '请督促未完成专家填报后再推进；专家未完成不允许强制汇总。\n'
          + getUserErrorMessage(error, ''),
        type: 'warning',
        okText: '知道了',
        hideCancel: true,
      })
      return
    }
    const variance = action === PortfolioEvaluationTaskAdvanceActionCode.START_RESULT_SUMMARY
      && !forceDespiteScoreVariance
      ? readScoreVarianceBlocking(error)
      : null
    if (variance) {
      const sampleText = variance.samples.length
        ? `\n样例：${variance.samples.join('；')}`
        : ''
      const countText = variance.groupCount != null ? `${variance.groupCount} 组` : '若干组'
      const thresholdText = variance.threshold != null ? `阈值 ${variance.threshold} 分` : '既定阈值'
      const confirmed = await confirmAsync({
        title: PortfolioEvaluationAdvanceBlockingDescription[
          PortfolioEvaluationAdvanceBlockingCode.SCORE_VARIANCE_EXCEEDED
        ],
        content:
          `${countText}被评对象评分分差超过${thresholdText}。${sampleText}\n\n`
          + '请先确认已完成追加评审；强制汇总将写入审计日志，不替代评委会判断。\n'
          + getUserErrorMessage(error, ''),
        type: 'warning',
        okText: '强制汇总',
      })
      if (confirmed) {
        advancingId.value = ''
        await advanceTask(row, action, true)
        return
      }
    }
    showUserError(error, '推进任务失败')
  } finally {
    advancingId.value = ''
  }
}

async function archiveTask(row: PortfolioEvaluationTaskVO) {
  if (writing.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '确认归档评价任务',
    content: `确认归档「${row.taskName}」？归档后任务不再接受新的评价与异议。`,
    type: 'warning',
    okText: '确认归档',
  })
  if (!confirmed || writing.value) {
    return
  }
  archivingId.value = row.id
  try {
    await portfolioEvaluationPublicityApi.archiveTask(row.id)
    void message.success('任务已归档')
    await loadPage()
  } catch (error) {
    showUserError(error, '归档任务失败')
  } finally {
    archivingId.value = ''
  }
}

function goObjectionHandling(row: PortfolioEvaluationTaskVO) {
  void router.push({
    path: '/portfolio/department/objection',
    query: { evaluationTaskId: row.id },
  })
}

function openPublishModal(row: PortfolioEvaluationTaskVO) {
  if (writing.value) {
    return
  }
  publishTarget.value = row
  publishForm.publicityTitle = `${row.taskName} 结果公示`
  publishForm.startTime = ''
  publishForm.endTime = ''
  publishModalOpen.value = true
}

async function submitPublish() {
  if (publishing.value) {
    return
  }
  if (!publishTarget.value) {
    return
  }
  if (!publishForm.publicityTitle.trim()) {
    showFormValidationMessage('请填写公示标题')
    return
  }
  if (!publishForm.startTime || !publishForm.endTime) {
    showFormValidationMessage('请填写公示起止时间')
    return
  }
  if (writing.value) {
    return
  }
  const evaluationTaskId = publishTarget.value.id
  const publicityTitle = publishForm.publicityTitle.trim()
  const startTime = publishForm.startTime
  const endTime = publishForm.endTime
  publishing.value = true
  try {
    await portfolioEvaluationPublicityApi.publishPublicity({
      evaluationTaskId,
      publicityTitle,
      startTime,
      endTime,
    })
    void message.success('公示已发布')
    publishModalOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '发布公示失败')
  } finally {
    publishing.value = false
  }
}

async function createRereview(row: PortfolioEvaluationTaskVO) {
  if (writing.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '发起更正复核',
    content: `确认对「${row.taskName}」发起归档后更正复核？将保留四冻结快照，仅允许通过复核工单改结论。`,
    type: 'warning',
    okText: '确认发起',
  })
  if (!confirmed || writing.value) {
    return
  }
  advancingId.value = row.id
  try {
    await portfolioEvaluationPublicityApi.createRereview({
      evaluationTaskId: row.id,
      reasonText: `管理员发起更正复核：${row.taskName}`,
    })
    void message.success('已创建复核工单并进入更正复核')
    await loadPage()
  } catch (error) {
    showUserError(error, '发起更正复核失败')
  } finally {
    advancingId.value = ''
  }
}

function goFillCorrection(row: PortfolioEvaluationTaskVO) {
  // 路由真源：admin/evaluation-fill（无 school/evaluation-fill）
  void router.push({
    path: '/portfolio/admin/evaluation-fill',
    query: { evaluationTaskId: row.id },
  })
}

/** 打开完成更正复核：列出开放工单，录入结论后逐条 complete（末单自动回写 ARCHIVED）。 */
async function openCompleteRereview(row: PortfolioEvaluationTaskVO) {
  if (writing.value) {
    return
  }
  completeRereviewTarget.value = row
  completeRereviewForm.conclusionSummary = ''
  completeRereviewForm.cancelReason = ''
  completeRereviewOrders.value = []
  completeRereviewModalOpen.value = true
  completeRereviewLoading.value = true
  try {
    const orders = await portfolioEvaluationPublicityApi.listRereview({
      evaluationTaskId: row.id,
    })
    completeRereviewOrders.value = (orders ?? []).filter((item) => item.orderStatus === 'OPEN')
  } catch (error) {
    completeRereviewModalOpen.value = false
    completeRereviewTarget.value = null
    showUserError(error, '加载更正复核工单失败')
  } finally {
    completeRereviewLoading.value = false
  }
}

async function submitCompleteRereview() {
  if (completeRereviewSubmitting.value || !completeRereviewTarget.value) {
    return
  }
  const conclusion = completeRereviewForm.conclusionSummary.trim()
  if (!conclusion) {
    showFormValidationMessage('请填写更正复核结论')
    return
  }
  const task = completeRereviewTarget.value
  const openOrders = [...completeRereviewOrders.value]
  completeRereviewSubmitting.value = true
  advancingId.value = task.id
  let completedCount = 0
  try {
    if (openOrders.length === 0) {
      // 无开放工单：任务可能已全部完成工单但状态残留，走推进回写
      await portfolioEvaluationPublicityApi.advanceTask({
        taskId: task.id,
        action: PortfolioEvaluationTaskAdvanceActionCode.COMPLETE_CORRECTION_REVIEW,
      })
    } else {
      for (const order of openOrders) {
        await portfolioEvaluationPublicityApi.completeRereview({
          orderId: order.id,
          conclusionSummary: conclusion,
        })
        completedCount += 1
      }
    }
    void message.success('更正复核已完成并回写归档')
    completeRereviewModalOpen.value = false
    completeRereviewTarget.value = null
    completeRereviewOrders.value = []
    completeRereviewForm.conclusionSummary = ''
    await loadPage()
  } catch (error) {
    try {
      const orders = await portfolioEvaluationPublicityApi.listRereview({
        evaluationTaskId: task.id,
      })
      if (completeRereviewTarget.value?.id === task.id) {
        completeRereviewOrders.value = (orders ?? []).filter((item) => item.orderStatus === 'OPEN')
      }
    } catch (reloadError) {
      showUserError(reloadError, '已写入部分工单，开放工单同步失败')
    }
    if (completedCount > 0) {
      showUserError(
        error,
        `已完成 ${completedCount} 条工单，后续失败；请仅处理剩余开放工单，勿重复完成已结案项`,
      )
    } else {
      showUserError(error, '完成更正复核失败')
    }
    try {
      await loadPage()
    } catch (pageError) {
      showUserError(pageError, '任务列表同步失败')
    }
  } finally {
    completeRereviewSubmitting.value = false
    advancingId.value = ''
  }
}

/** 撤销单条开放更正复核工单（不改结论）。 */
async function cancelRereviewOrder(order: PortfolioEvaluationRereviewOrderVO): Promise<void> {
  if (cancelRereviewSubmitting.value || completeRereviewSubmitting.value) {
    return
  }
  const reason = completeRereviewForm.cancelReason.trim()
  if (!reason) {
    void message.warning('请填写撤销原因')
    return
  }
  cancelRereviewSubmitting.value = true
  advancingId.value = completeRereviewTarget.value?.id
    ? String(completeRereviewTarget.value.id)
    : ''
  try {
    await portfolioEvaluationPublicityApi.cancelRereview({
      orderId: order.id,
      reasonText: reason,
    })
    void message.success('复核工单已撤销')
    // 刷新开放工单列表；若已无开放工单则关闭弹窗并重载任务
    const task = completeRereviewTarget.value
    if (!task) {
      completeRereviewModalOpen.value = false
      await loadPage()
      return
    }
    const orders = await portfolioEvaluationPublicityApi.listRereview({
      evaluationTaskId: task.id,
    })
    completeRereviewOrders.value = (orders ?? []).filter((item) => item.orderStatus === 'OPEN')
    if (completeRereviewOrders.value.length === 0) {
      completeRereviewModalOpen.value = false
      completeRereviewTarget.value = null
      completeRereviewOrders.value = []
      completeRereviewForm.conclusionSummary = ''
      completeRereviewForm.cancelReason = ''
      await loadPage()
    }
  } catch (error) {
    showUserError(error, '撤销复核工单失败')
  } finally {
    cancelRereviewSubmitting.value = false
    advancingId.value = ''
  }
}

/** 组装学校评价任务行内操作。 */
function buildTaskRowActions(row: PortfolioEvaluationTaskVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  // PF-P0-403：非租户管理员（工作组成员）仅查看台账/深链，不展示写动作
  if (!isTenantAdmin.value) {
    return actions
  }
  const advance = nextAction(row.taskStatus)
  // 行内仅 1 个 primary：阶段主动作优先（恢复 > 发布 > 异议 > 推进 > 归档）
  if (row.taskStatus === PortfolioEvaluationTaskStatusEnum.SUSPENDED) {
    actions.push({ key: 'resume', label: '恢复任务', tone: 'primary', disabled: writing.value })
  } else if (row.taskStatus === PortfolioEvaluationTaskStatusEnum.RESULT_SUMMARY) {
    actions.push({ key: 'publish', label: '发布公示', tone: 'primary', disabled: writing.value })
    if (advance) {
      actions.push({
        key: 'advance',
        label: advanceActionLabel(advance),
        disabled: writing.value,
      })
    }
  } else if (row.taskStatus === PortfolioEvaluationTaskStatusEnum.OBJECTION_HANDLING) {
    actions.push({ key: 'objection', label: '处理异议', tone: 'primary' })
    if (advance) {
      actions.push({
        key: 'advance',
        label: advanceActionLabel(advance),
        disabled: writing.value,
      })
    }
  } else if (advance) {
    const expertNotReady = advance === PortfolioEvaluationTaskAdvanceActionCode.START_RESULT_SUMMARY
      && row.expertReviewComplete === false
    actions.push({
      key: 'advance',
      label: expertNotReady
        ? `${advanceActionLabel(advance)}（专家未完成）`
        : advanceActionLabel(advance),
      tone: 'primary',
      disabled: writing.value || expertNotReady,
    })
  } else if (canArchiveTask(row)) {
    actions.push({
      key: 'archive',
      label: '归档',
      tone: 'primary',
      disabled: writing.value,
    })
  }
  if (row.taskStatus !== PortfolioEvaluationTaskStatusEnum.SUSPENDED && canSuspendTask(row)) {
    actions.push({ key: 'suspend', label: '暂停任务', tone: 'danger', disabled: writing.value })
  }
  // P2-34：已发布周期可关闭；与草稿作废分流，禁止 DRAFT 走 CLOSE。
  if (canCloseTask(row)) {
    actions.push({ key: 'close', label: '关闭任务', tone: 'danger', disabled: writing.value })
  }
  if (canArchiveTask(row) && !actions.some((item) => item.key === 'archive')) {
    actions.push({
      key: 'archive',
      label: '归档',
      disabled: writing.value,
    })
  }
  if (row.taskStatus === PortfolioEvaluationTaskStatusEnum.ARCHIVED) {
    actions.push({
      key: 'rereview',
      label: '发起更正复核',
      tone: 'primary',
      disabled: writing.value,
    })
  }
  if (row.taskStatus === PortfolioEvaluationTaskStatusEnum.CORRECTION_REVIEW) {
    actions.push({
      key: 'fillCorrection',
      label: '去改结论',
    })
    actions.push({
      key: 'completeRereview',
      label: '完成更正复核',
      tone: 'primary',
      disabled: writing.value,
    })
  }
  // PF-P0-317：草稿可作废，发布后走关闭/归档等终态路径
  if (row.taskStatus === PortfolioEvaluationTaskStatusEnum.DRAFT) {
    actions.push({
      key: 'void',
      label: '作废',
      tone: 'danger',
      disabled: writing.value,
    })
  }
  return actions
}

function handleTaskRowAction(key: string, row: PortfolioEvaluationTaskVO): void {
  switch (key) {
    case 'advance':
      void advanceTask(row)
      break
    case 'suspend':
      void advanceTask(row, PortfolioEvaluationTaskAdvanceActionCode.SUSPEND)
      break
    case 'close':
      void advanceTask(row, PortfolioEvaluationTaskAdvanceActionCode.CLOSE)
      break
    case 'resume':
      void advanceTask(row, PortfolioEvaluationTaskAdvanceActionCode.RESUME)
      break
    case 'publish':
      openPublishModal(row)
      break
    case 'objection':
      goObjectionHandling(row)
      break
    case 'archive':
      void archiveTask(row)
      break
    case 'rereview':
      void createRereview(row)
      break
    case 'fillCorrection':
      goFillCorrection(row)
      break
    case 'completeRereview':
      void openCompleteRereview(row)
      break
    case 'void':
      void advanceTask(row, PortfolioEvaluationTaskAdvanceActionCode.VOID)
      break
  }
}

watch(
  () => createForm.evaluationMode,
  (mode) => {
    if (mode !== PortfolioEvaluationModeCode.BY_PERSON) {
      createForm.targetIndicatorCode = ''
    }
  },
)

watch(
  () => route.query.evaluationTaskId,
  async (taskId, previousTaskId) => {
    const next = typeof taskId === 'string' ? taskId.trim() : ''
    const prev = typeof previousTaskId === 'string' ? previousTaskId.trim() : ''
    if (next === prev) {
      return
    }
    pageNum.value = 1
    pendingLocateTaskId.value = next
    autoOpenedCompleteRereview.value = false
    await loadPage()
  },
)

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="学校评价"
        :subtitle="isTenantAdmin
          ? '评价任务状态推进、公示发布与归档'
          : '工作组任务台账：查看状态与站内信深链定位'"
      >
        <template #actions>
          <UiButton
            v-if="isTenantAdmin"
            size="sm"
            variant="primary"
            @click="() => void openCreateModal()"
          >
            新建任务
          </UiButton>
          <UiSelect
            size="sm"
            v-model="sceneFilter"
            allow-clear
            placeholder="业务场景"
            style="width: 150px"
            :options="PORTFOLIO_EVALUATION_SCENE_OPTIONS"
            @change="onSceneFilterChange"
          />
          <UiButton size="sm" :loading="loading" @click="() => void loadPage()"> 刷新 </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiAlertStrip
      v-if="archiveReminderText"
      tone="warning"
      :closable="false"
      :title="archiveReminderText"
    />

    <UiCard title="评价任务">
      <UiDataTable
        v-if="rows.length || loading"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="id"
        :row-class-name="taskRowClassName"
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sceneCode'">
            {{ evaluationSceneLabel(record.sceneCode) }}
          </template>
          <template v-else-if="column.key === 'timeWindow'">
            {{ record.startTime }} — {{ record.endTime }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag :tone="taskStatusTone(record.taskStatus)">
              {{ taskStatusLabel(record.taskStatus) }}
            </UiTag>
            <span
              v-if="expertReviewProgressText(record)"
              class="school-evaluation__suspended-from"
            >
              · {{ expertReviewProgressText(record) }}
            </span>
            <span v-if="record.suspendedFromStatus" class="school-evaluation__suspended-from">
              恢复至 {{ taskStatusLabel(record.suspendedFromStatus) }}
            </span>
            <span v-if="record.suspendedAt" class="school-evaluation__suspended-from">
              · 暂停自 {{ record.suspendedAt }}
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildTaskRowActions(record)"
              @action="(key) => handleTaskRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
      <WorkbenchContextGateStrip
        v-else
        tag="无任务"
        :body="isTenantAdmin ? '暂无评价任务，请先新建任务' : '暂无可查看的评价任务'"
        :hide-cta="!isTenantAdmin"
        cta-label="新建任务"
        @cta="() => void openCreateModal()"
      />
    </UiCard>

    <UiDialog
      v-model:open="publishModalOpen"
      title="发布评价公示"
      ok-text="发布"
      cancel-text="取消"
      @ok="() => void submitPublish()"
    >
      <UiInput
        size="sm"
        v-model="publishForm.publicityTitle"
        class="school-evaluation__field"
        placeholder="公示标题"
      />
      <UiDatePicker
        size="sm"
        v-model="publishForm.startTime"
        :show-time="true"
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="开始时间"
        class="school-evaluation__field"
        style="width: 100%"
      />
      <UiDatePicker
        size="sm"
        v-model="publishForm.endTime"
        :show-time="true"
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="结束时间"
        style="width: 100%"
      />
    </UiDialog>

    <UiDialog
      v-model:open="createModalOpen"
      title="新建评价任务"
      ok-text="创建"
      cancel-text="取消"
      :confirm-loading="creating || createContextLoading"
      @ok="() => void submitCreateTask()"
    >
      <UiAlertStrip
        v-if="workgroupsLoadFailed"
        tone="error"
        title="评价工作组加载失败"
        class="school-evaluation__field"
      />
      <UiAlertStrip
        v-else-if="!workgroupsLoading && workgroups.length === 0"
        tone="warning"
        title="当前没有可用于创建任务的启用工作组"
        class="school-evaluation__field"
      />
      <UiInput
        size="sm"
        v-model="createForm.taskName"
        class="school-evaluation__field"
        placeholder="任务名称"
        :disabled="creating || createContextLoading"
      />
      <UiSelect
        size="sm"
        v-model="createForm.workgroupId"
        :loading="workgroupsLoading"
        :options="
          workgroups.map((item) => ({
            value: item.id,
            label: `${item.workgroupName}（${item.workgroupCode}）`,
          }))
        "
        placeholder="选择启用的评价工作组"
        class="school-evaluation__field"
        :disabled="creating || createContextLoading || workgroupsLoadFailed"
      />
      <UiSelect
        size="sm"
        v-model="createForm.evaluationMode"
        :options="PORTFOLIO_EVALUATION_MODE_OPTIONS"
        placeholder="评价模式"
        class="school-evaluation__field"
        :disabled="creating"
      />
      <UiSelect
        size="sm"
        v-model="createForm.sceneCode"
        :options="PORTFOLIO_EVALUATION_SCENE_OPTIONS"
        placeholder="业务场景（§8.48 多周期隔离）"
        class="school-evaluation__field"
        :disabled="creating"
      />
      <UiAlertStrip
        v-if="
          createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
            && indicatorConfigsLoadFailed
        "
        tone="error"
        title="可回流指标加载失败"
        class="school-evaluation__field"
      />
      <UiAlertStrip
        v-else-if="
          createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
            && !indicatorConfigsLoading
            && indicatorConfigs.length === 0
        "
        tone="warning"
        title="当前没有已启用的画像回流指标"
        class="school-evaluation__field"
      />
      <UiSelect
        size="sm"
        v-if="createForm.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON"
        v-model="createForm.targetIndicatorCode"
        class="school-evaluation__field"
        placeholder="选择画像回流指标"
        :loading="indicatorConfigsLoading"
        :options="enabledIndicatorOptions"
        :disabled="creating || indicatorConfigsLoading || indicatorConfigsLoadFailed"
      />
      <UiDatePicker
        size="sm"
        v-model="createForm.startTime"
        :show-time="true"
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="评价开始时间"
        class="school-evaluation__field"
        style="width: 100%"
        :disabled="creating"
      />
      <UiDatePicker
        size="sm"
        v-model="createForm.endTime"
        :show-time="true"
        value-format="YYYY-MM-DD HH:mm:ss"
        placeholder="评价结束时间"
        style="width: 100%"
        :disabled="creating"
      />
    </UiDialog>

    <UiDialog
      v-model:open="completeRereviewModalOpen"
      title="完成更正复核"
      ok-text="确认完成"
      cancel-text="取消"
      :confirm-loading="
        completeRereviewSubmitting || completeRereviewLoading || cancelRereviewSubmitting
      "
      @ok="() => void submitCompleteRereview()"
    >
      <p class="school-evaluation__field">
        任务「{{ completeRereviewTarget?.taskName || '' }}」：
        <template v-if="completeRereviewLoading">正在加载开放工单…</template>
        <template v-else-if="completeRereviewOrders.length === 0">
          当前无开放复核工单，将直接回写归档。
        </template>
        <template v-else>
          将完成 {{ completeRereviewOrders.length }} 条开放工单并在全部完成后回写归档。
        </template>
      </p>
      <ul
        v-if="!completeRereviewLoading && completeRereviewOrders.length > 0"
        class="school-evaluation__field school-evaluation__rereview-orders"
      >
        <li v-for="order in completeRereviewOrders" :key="String(order.id)">
          工单 #{{ order.id }}
          <template v-if="order.subjectTeacherUserId">
            ·
            {{
              formatPortfolioTeacherDisplay(order.subjectTeacherName, order.subjectTeacherNumber)
            }}
          </template>
          <template v-else> · 整任务</template>
          <template v-if="order.lifecycleStatus">
            · {{ portfolioLifecycleStatusDisplay(order.lifecycleStatus) }}
          </template>
          <template v-if="order.evaluationHeld"> · 参评 hold</template>
          <UiButton
            size="sm"
            variant="ghost"
            class="school-evaluation__cancel-order"
            :disabled="cancelRereviewSubmitting || completeRereviewSubmitting"
            @click="() => void cancelRereviewOrder(order)"
          >
            撤销工单
          </UiButton>
        </li>
      </ul>
      <UiInput
        size="sm"
        v-model="completeRereviewForm.cancelReason"
        class="school-evaluation__field"
        placeholder="撤销原因（撤销工单时必填）"
      />
      <UiInput
        size="sm"
        v-model="completeRereviewForm.conclusionSummary"
        class="school-evaluation__field"
        placeholder="更正复核结论摘要（完成时必填）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.school-evaluation__field {
  display: block;
  width: 100%;
  margin-bottom: var(--dp-space-component);
}

.school-evaluation__cancel-order {
  margin-left: var(--dp-space-component-tight);
}

.school-evaluation__suspended-from {
  display: block;
  margin-top: var(--dp-space-component-xs);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
}

:deep(.school-evaluation__row-active) {
  background: var(--dp-color-primary-bg);
}
</style>
