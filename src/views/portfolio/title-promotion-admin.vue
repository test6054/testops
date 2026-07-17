<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTitleCriteriaTemplateVO,
  PortfolioTitlePromotionApplicationVO,
  PortfolioTitlePromotionFlowViewVO,
  PortfolioTitlePromotionTaskVO,
  PortfolioTitleTaskCriteriaChangeLogVO,
  PortfolioTitleTaskCriteriaItem,
  PortfolioTitleTaskCriteriaVO
} from '@/apis/portfolio/title-promotion'
import type { PortfolioArchiveCategoryTreeNodeVO } from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioTitlePromotionApi } from '@/apis/portfolio/title-promotion'
import TitlePromotionFlowPanel from '@/components/portfolio/TitlePromotionFlowPanel.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import { PortfolioArchiveCategoryStatusCode } from '@/types/enums/portfolio-archive-category-status-enum'
import { isPortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import {
  PortfolioTitleCriteriaChangeActionDescription,
} from '@/types/enums/portfolio-title-criteria-change-action-enum'
import {
  ALL_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES,
  isEvidenceCategoryRequiredCheckType,
  PortfolioTitleCriteriaCheckTypeCode,
  PortfolioTitleCriteriaCheckTypeDescription,
  requiresPositiveExpectedValueCheckType,
} from '@/types/enums/portfolio-title-criteria-check-type-enum'
import {
  PortfolioTitleCriteriaGateKindCode,
  PortfolioTitleCriteriaGateKindDescription,
} from '@/types/enums/portfolio-title-criteria-gate-kind-enum'
import {
  PortfolioTitleCriteriaPathCode,
  PortfolioTitleCriteriaPathDescription,
} from '@/types/enums/portfolio-title-criteria-path-code-enum'
import {
  PortfolioTitleCriteriaSatisfyModeCode,
  PortfolioTitleCriteriaSatisfyModeDescription,
} from '@/types/enums/portfolio-title-criteria-satisfy-mode-enum'
import {
  ALL_PORTFOLIO_TITLE_JOB_CATEGORY_CODES,
  PortfolioTitleJobCategoryDescription,
} from '@/types/enums/portfolio-title-job-category-enum'
import {
  ALL_PORTFOLIO_TITLE_PROMOTION_APPLICATION_STATUS_CODES,
  PortfolioTitlePromotionApplicationStatusCode,
  PortfolioTitlePromotionApplicationStatusDescription,
} from '@/types/enums/portfolio-title-promotion-application-status-enum'
import {
  PortfolioTitlePromotionTaskStatusCode,
  PortfolioTitlePromotionTaskStatusDescription,
} from '@/types/enums/portfolio-title-promotion-task-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const userStore = useUserStore()
const router = useRouter()
const canManageSchoolWorkflow = computed(() => userStore.isTenantAdmin)
const tabItems = computed(() => {
  const items: Array<{ key: 'task' | 'application', label: string }> = []
  if (canManageSchoolWorkflow.value) {
    items.push({ key: 'task', label: '申报任务' })
  }
  items.push({ key: 'application', label: '申报审核' })
  return items
})
const activeTab = ref<'task' | 'application'>(
  canManageSchoolWorkflow.value ? 'task' : 'application',
)
if (!canManageSchoolWorkflow.value) {
  activeTab.value = 'application'
}
const taskLoading = ref(false)
const {
  loadError: taskLoadError,
  beginLoad: beginTaskLoad,
  failLoad: failTaskLoad,
  okLoad: okTaskLoad,
} = useUiTableLoadError()
const {
  loadError: appLoadError,
  beginLoad: beginAppLoad,
  failLoad: failAppLoad,
  okLoad: okAppLoad,
} = useUiTableLoadError()
const appLoading = ref(false)
const saving = ref(false)
const tasks = ref<PortfolioTitlePromotionTaskVO[]>([])
const apps = ref<PortfolioTitlePromotionApplicationVO[]>([])
const taskTotal = ref(0)
const appTotal = ref(0)
const editorOpen = ref(false)
const reviewOpen = ref(false)
const expertOpen = ref(false)
const publicityOpen = ref(false)
const editingId = ref<string | undefined>()
const reviewTarget = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const expertTarget = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const reviewFlow = ref<PortfolioTitlePromotionFlowViewVO | null>(null)
const expertFlow = ref<PortfolioTitlePromotionFlowViewVO | null>(null)
const reviewFlowLoading = ref(false)
const expertFlowLoading = ref(false)
const publicityTarget = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const criteriaOpen = ref(false)
const criteriaTask = ref<PortfolioTitlePromotionTaskVO | null>(null)
const criteriaList = ref<PortfolioTitleTaskCriteriaVO[]>([])
const criteriaTemplates = ref<PortfolioTitleCriteriaTemplateVO[]>([])
const criteriaCategoryOptions = ref<Array<{ value: string, label: string }>>([])
const selectedTemplateIds = ref<string[]>([])
const changeLogs = ref<PortfolioTitleTaskCriteriaChangeLogVO[]>([])
const emergencyReason = ref('')
const criteriaLoading = ref(false)
const criteriaSaving = ref(false)
const criteriaBaseline = ref('')
/** 任务条件导入完整读取租户模板库的最大页数，超过时显式暴露配置规模异常。 */
const TITLE_CRITERIA_TEMPLATE_PAGE_MAX = 100
const taskRequestToken = ref(0)
const appRequestToken = ref(0)
const operationKey = ref('')
const writing = computed(() => saving.value || Boolean(operationKey.value))

const taskQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const appQuery = reactive<{
  pageNum: number
  pageSize: number
  applicationStatus?: PortfolioTitlePromotionApplicationStatusCode
}>({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const form = reactive({
  taskName: '',
  targetTitleLevel: '',
  reviewYear: String(new Date().getFullYear()),
})

const reviewForm = reactive({
  opinion: '',
})

const expertForm = reactive({
  opinion: '',
})

const publicityForm = reactive({
  days: 7,
  remark: '',
})

const taskColumns: ColumnsType = [
  { title: '任务', dataIndex: 'taskName', key: 'taskName' },
  { title: '目标层级', dataIndex: 'targetTitleLevel', key: 'targetTitleLevel', width: 120 },
  { title: '年度', dataIndex: 'reviewYear', key: 'reviewYear', width: 80 },
  {
    title: '条件数',
    key: 'criteriaCount',
    width: 90,
  },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '操作', key: 'actions', width: 220 },
]

const appColumns: ColumnsType = [
  { title: '单号', dataIndex: 'applicationNo', key: 'applicationNo', width: 180 },
  { title: '任务', dataIndex: 'taskName', key: 'taskName' },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 120 },
  { title: '匹配度', dataIndex: 'matchScore', key: 'matchScore', width: 90 },
  { title: '红线', key: 'redlineBlocked', width: 80 },
  { title: '状态', key: 'applicationStatus', width: 120 },
  { title: '操作', key: 'actions', width: 280 },
]

/** 院审/人事读整袋：teacherUserId 即档案 teacherId */
function goTeacherPortfolioPage(path: string, teacherId?: string) {
  if (!teacherId) {
    showFormValidationMessage('申报单缺少教师编号，无法打开档案袋')
    return
  }
  void router.push({
    path,
    query: { teacherId },
  })
}

const statusOptions = ALL_PORTFOLIO_TITLE_PROMOTION_APPLICATION_STATUS_CODES.map((code) => ({
  value: code,
  label: PortfolioTitlePromotionApplicationStatusDescription[code],
}))

function taskStatusLabel(code: PortfolioTitlePromotionTaskStatusCode) {
  return strictEnumLabel(
    PortfolioTitlePromotionTaskStatusDescription,
    code,
    '任务状态',
  )
}

function appStatusLabel(code: PortfolioTitlePromotionApplicationStatusCode) {
  return strictEnumLabel(
    PortfolioTitlePromotionApplicationStatusDescription,
    code,
    '申请状态',
  )
}

/** 职称治理状态写必须串行，避免同一申请被多个抽屉并发推进。 */
function beginWorkflowOperation(key: string): boolean {
  if (writing.value) {
    return false
  }
  operationKey.value = key
  return true
}

function endWorkflowOperation(key: string) {
  if (operationKey.value === key) {
    operationKey.value = ''
  }
}

async function loadTasks() {
  const currentToken = taskRequestToken.value + 1
  taskRequestToken.value = currentToken
  const request = { pageNum: taskQuery.pageNum, pageSize: taskQuery.pageSize }
  beginTaskLoad()
  taskLoading.value = true
  try {
    const page = await portfolioTitlePromotionApi.pageTask(request)
    if (taskRequestToken.value !== currentToken) {
      return
    }
    tasks.value = page.list ?? []
    taskTotal.value = page.total ?? 0

    okTaskLoad()
  } catch (error) {
    if (taskRequestToken.value !== currentToken) {
      return
    }
    tasks.value = []
    taskTotal.value = 0
    failTaskLoad()
    showUserError(error, '加载职称任务失败')
  } finally {
    if (taskRequestToken.value === currentToken) {
      taskLoading.value = false
    }
  }
}

async function loadApps() {
  const currentToken = appRequestToken.value + 1
  appRequestToken.value = currentToken
  const request = {
    pageNum: appQuery.pageNum,
    pageSize: appQuery.pageSize,
    applicationStatus: appQuery.applicationStatus,
  }
  beginAppLoad()
  appLoading.value = true
  try {
    const page = await portfolioTitlePromotionApi.pageApplication(request)
    if (appRequestToken.value !== currentToken) {
      return
    }
    apps.value = page.list ?? []
    appTotal.value = page.total ?? 0

    okAppLoad()
  } catch (error) {
    if (appRequestToken.value !== currentToken) {
      return
    }
    apps.value = []
    appTotal.value = 0
    failAppLoad()
    showUserError(error, '加载职称申报失败')
  } finally {
    if (appRequestToken.value === currentToken) {
      appLoading.value = false
    }
  }
}

function openCreate() {
  if (writing.value) return
  editingId.value = undefined
  form.taskName = ''
  form.targetTitleLevel = ''
  form.reviewYear = String(new Date().getFullYear())
  editorOpen.value = true
}

function openEdit(row: PortfolioTitlePromotionTaskVO) {
  if (writing.value) return
  if (row.taskStatus !== PortfolioTitlePromotionTaskStatusCode.DRAFT) {
    showFormValidationMessage('仅草稿可编辑')
    return
  }
  editingId.value = row.id
  form.taskName = row.taskName
  form.targetTitleLevel = row.targetTitleLevel
  form.reviewYear = row.reviewYear
  editorOpen.value = true
}

async function saveTask() {
  if (writing.value) return
  if (!form.taskName.trim() || !form.targetTitleLevel.trim() || !form.reviewYear.trim()) {
    message.error('任务名称、目标层级与年度不能为空')
    return
  }
  saving.value = true
  try {
    await portfolioTitlePromotionApi.saveTask({
      id: editingId.value,
      taskName: form.taskName.trim(),
      targetTitleLevel: form.targetTitleLevel.trim(),
      reviewYear: form.reviewYear.trim(),
    })
    message.success('任务已保存')
    editorOpen.value = false
    await loadTasks()
  } catch (error) {
    showUserError(error, '保存任务失败')
  } finally {
    saving.value = false
  }
}

async function publishTask(row: PortfolioTitlePromotionTaskVO) {
  const operation = `publish:${row.id}`
  if (!beginWorkflowOperation(operation)) return
  try {
    const confirmed = await confirmAsync({
      title: '确认发布职称申报任务',
      content: `确认发布「${row.taskName}」？发布后教师可正式申报，任务基础条件不再按草稿方式修改。`,
      type: 'warning',
      okText: '确认发布',
    })
    if (!confirmed) return
    await portfolioTitlePromotionApi.publishTask({ id: row.id })
    message.success('任务已发布')
    await loadTasks()
  } catch (error) {
    showUserError(error, '发布失败')
  } finally {
    endWorkflowOperation(operation)
  }
}

async function closeTask(row: PortfolioTitlePromotionTaskVO) {
  const operation = `close:${row.id}`
  if (!beginWorkflowOperation(operation)) return
  try {
    const confirmed = await confirmAsync({
      title: '确认关闭职称申报任务',
      content: `确认关闭「${row.taskName}」？关闭后不再接受新的申报。`,
      type: 'warning',
      okText: '确认关闭',
    })
    if (!confirmed) return
    await portfolioTitlePromotionApi.closeTask({ id: row.id })
    message.success('任务已关闭')
    await loadTasks()
  } catch (error) {
    showUserError(error, '关闭失败')
  } finally {
    endWorkflowOperation(operation)
  }
}

async function openCriteria(row: PortfolioTitlePromotionTaskVO) {
  criteriaTask.value = row
  criteriaOpen.value = true
  emergencyReason.value = ''
  selectedTemplateIds.value = []
  criteriaLoading.value = true
  try {
    const list = await portfolioTitlePromotionApi.listTaskCriteria({ taskId: row.id })
    criteriaList.value = list || []
    criteriaBaseline.value = criteriaFingerprint()
    try {
      const tree = await portfolioArchiveTemplateApi.listCategoryTree()
      const options: Array<{ value: string, label: string }> = []
      const visit = (nodes: PortfolioArchiveCategoryTreeNodeVO[]) => {
        for (const node of nodes) {
          if (node.status === PortfolioArchiveCategoryStatusCode.ACTIVE) {
            options.push({ value: node.categoryCode, label: node.categoryName + '（' + node.categoryCode + '）' })
          }
          visit(node.children || [])
        }
      }
      visit(tree || [])
      criteriaCategoryOptions.value = options
    }
    catch (error) {
      criteriaCategoryOptions.value = []
      showUserError(error, '加载档案分类失败')
    }
    try {
      const allTemplates: PortfolioTitleCriteriaTemplateVO[] = []
      for (let pageNum = 1; pageNum <= TITLE_CRITERIA_TEMPLATE_PAGE_MAX; pageNum++) {
        const templates = await portfolioTitlePromotionApi.pageCriteriaTemplate({
          pageNum,
          pageSize: 100,
          enabled: true,
        })
        allTemplates.push(...(templates.list || []))
        if (pageNum >= templates.pages || templates.list.length < templates.pageSize) {
          criteriaTemplates.value = allTemplates
          break
        }
        if (pageNum === TITLE_CRITERIA_TEMPLATE_PAGE_MAX) {
          throw new Error(`启用条件模板分页超过 ${TITLE_CRITERIA_TEMPLATE_PAGE_MAX} 页`)
        }
      }
    } catch (error) {
      criteriaTemplates.value = []
      showUserError(error, '加载条件模板失败')
    }
    try {
      if (row.taskStatus === PortfolioTitlePromotionTaskStatusCode.PUBLISHED) {
        const logs = await portfolioTitlePromotionApi.pageTaskCriteriaChangeLog({
          taskId: row.id,
          pageNum: 1,
          pageSize: 20,
        })
        changeLogs.value = logs.list || []
      } else {
        changeLogs.value = []
      }
    } catch (error) {
      changeLogs.value = []
      showUserError(error, '加载条件变更记录失败')
    }
  }
  catch (error) {
    criteriaList.value = []
    criteriaBaseline.value = ''
    criteriaTemplates.value = []
    changeLogs.value = []
    showUserError(error, '加载任务条件失败')
  }
  finally {
    criteriaLoading.value = false
  }
}

const gateKindOptions = Object.values(PortfolioTitleCriteriaGateKindCode).map(value => ({
  value,
  label: PortfolioTitleCriteriaGateKindDescription[value],
}))
const checkTypeOptions = ALL_PORTFOLIO_TITLE_CRITERIA_CHECK_TYPE_CODES.map(value => ({
  value,
  label: PortfolioTitleCriteriaCheckTypeDescription[value],
}))
const pathCodeOptions = Object.values(PortfolioTitleCriteriaPathCode).map(value => ({
  value,
  label: PortfolioTitleCriteriaPathDescription[value],
}))
const satisfyModeOptions = Object.values(PortfolioTitleCriteriaSatisfyModeCode).map(value => ({
  value,
  label: PortfolioTitleCriteriaSatisfyModeDescription[value],
}))
const jobCategoryOptions = ALL_PORTFOLIO_TITLE_JOB_CATEGORY_CODES.map(value => ({
  value,
  label: PortfolioTitleJobCategoryDescription[value],
}))

function canEditCriteriaList() {
  if (!criteriaTask.value) return false
  return criteriaTask.value.taskStatus === PortfolioTitlePromotionTaskStatusCode.DRAFT
    || criteriaTask.value.taskStatus === PortfolioTitlePromotionTaskStatusCode.PUBLISHED
}

function toCriteriaItems(): PortfolioTitleTaskCriteriaItem[] {
  return criteriaList.value.map((item, index) => ({
    // 临时前端行 id（tmp-*）不得提交，replace 整表不依赖 id
    id: item.id && !String(item.id).startsWith('tmp-') ? item.id : undefined,
    criteriaCode: (item.criteriaCode || '').trim(),
    criteriaTitle: (item.criteriaTitle || '').trim(),
    criteriaDescription: item.criteriaDescription,
    gateKind: item.gateKind,
    checkType: item.checkType,
    satisfyMode: item.satisfyMode,
    groupCode: item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ALL
      ? undefined
      : item.groupCode,
    groupMinimumCount: item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP
      ? item.groupMinimumCount
      : undefined,
    pathCode: item.pathCode,
    jobCategory: item.jobCategory,
    expectedValue: item.expectedValue,
    evidenceCategoryCode: item.evidenceCategoryCode,
    blockOnFail: item.gateKind === PortfolioTitleCriteriaGateKindCode.HARD
      ? true
      : Boolean(item.blockOnFail),
    sourceTemplateId: item.sourceTemplateId,
    sortNo: item.sortNo ?? (index + 1) * 10,
  }))
}

function criteriaFingerprint(): string {
  return JSON.stringify(toCriteriaItems())
}

const hasUnsavedCriteriaChanges = computed(() =>
  criteriaBaseline.value !== '' && criteriaFingerprint() !== criteriaBaseline.value,
)

const availableCriteriaTemplates = computed(() => {
  const imported = new Set(criteriaList.value
    .map(item => item.sourceTemplateId)
    .filter((id): id is string => Boolean(id)))
  return criteriaTemplates.value.filter(item => !imported.has(item.id))
})

function validateCriteriaDraftList() {
  if (!criteriaList.value.length) {
    showFormValidationMessage('条件列表不能为空')
    return false
  }
  const codes = new Set<string>()
  for (const item of criteriaList.value) {
    const code = (item.criteriaCode || '').trim()
    const title = (item.criteriaTitle || '').trim()
    if (!code || !title || !item.gateKind || !item.checkType || !item.satisfyMode || !item.pathCode) {
      showFormValidationMessage('请完整填写条件编码、标题、门槛、核验类型、满足模式与路径')
      return false
    }
    if (codes.has(code)) {
      showFormValidationMessage(`条件编码重复：${code}`)
      return false
    }
    codes.add(code)
    if (
      (item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP
        || item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP)
      && !(item.groupCode || '').trim()
    ) {
      showFormValidationMessage(`组满足模式必须填写组编码：${code}`)
      return false
    }
    if (item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP
      && (!item.groupMinimumCount || item.groupMinimumCount < 1)) {
      showFormValidationMessage('组内最低满足条数必须为正整数：' + code)
      return false
    }
    if (item.gateKind === PortfolioTitleCriteriaGateKindCode.HARD && !item.blockOnFail) {
      showFormValidationMessage('硬门槛条件必须开启「不满足时阻断提交」：' + code)
      return false
    }
    if (requiresPositiveExpectedValueCheckType(item.checkType)
      && !/^[1-9]\d*$/.test((item.expectedValue || '').trim())) {
      showFormValidationMessage('当前核验类型必须填写正整数阈值：' + code)
      return false
    }
    if (item.checkType === PortfolioTitleCriteriaCheckTypeCode.DEGREE_REQUIREMENT
      && !(item.expectedValue || '').trim()) {
      showFormValidationMessage('学历学位要求必须填写期望值：' + code)
      return false
    }
    if (item.checkType === PortfolioTitleCriteriaCheckTypeCode.HONOR_LEVEL
      && !isPortfolioHonorLevelCode((item.expectedValue || '').trim())) {
      showFormValidationMessage('获奖级别必须填写有效级别编码：' + code)
      return false
    }
    if (isEvidenceCategoryRequiredCheckType(item.checkType) && !item.evidenceCategoryCode) {
      showFormValidationMessage('当前核验类型必须选择证据档案分类：' + code)
      return false
    }
  }
  const researchCriteria = criteriaList.value.filter(item =>
    item.checkType === PortfolioTitleCriteriaCheckTypeCode.PUBLICATION_COUNT
    || item.checkType === PortfolioTitleCriteriaCheckTypeCode.PROJECT_COUNT,
  )
  for (let leftIndex = 0; leftIndex < researchCriteria.length; leftIndex++) {
    const left = researchCriteria[leftIndex]
    for (let rightIndex = leftIndex + 1; rightIndex < researchCriteria.length; rightIndex++) {
      const right = researchCriteria[rightIndex]
      if (left.checkType === right.checkType
        || !left.evidenceCategoryCode
        || left.evidenceCategoryCode !== right.evidenceCategoryCode) {
        continue
      }
      const pathOverlap = left.pathCode === PortfolioTitleCriteriaPathCode.COMMON
        || right.pathCode === PortfolioTitleCriteriaPathCode.COMMON
        || left.pathCode === right.pathCode
      const jobOverlap = !left.jobCategory || !right.jobCategory
        || left.jobCategory === right.jobCategory
      if (pathOverlap && jobOverlap) {
        showFormValidationMessage(
          `同一申报路径/岗位的论文与项目条件不得复用证据档案分类：${left.evidenceCategoryCode}`,
        )
        return false
      }
    }
  }
  return true
}

function addCriteriaRow() {
  if (!canEditCriteriaList()) return
  const index = criteriaList.value.length + 1
  criteriaList.value.push({
    id: `tmp-${Date.now()}-${index}`,
    taskId: criteriaTask.value?.id || '',
    criteriaCode: `CUSTOM_${index}`,
    criteriaTitle: '',
    criteriaDescription: '',
    gateKind: PortfolioTitleCriteriaGateKindCode.HARD,
    checkType: PortfolioTitleCriteriaCheckTypeCode.MANUAL_CHECK,
    satisfyMode: PortfolioTitleCriteriaSatisfyModeCode.ALL,
    groupCode: undefined,
    groupMinimumCount: undefined,
    pathCode: PortfolioTitleCriteriaPathCode.COMMON,
    jobCategory: undefined,
    expectedValue: undefined,
    evidenceCategoryCode: undefined,
    blockOnFail: true,
    sourceTemplateId: undefined,
    frozen: false,
    sortNo: index * 10,
  })
}

function removeCriteriaRow(index: number) {
  if (!canEditCriteriaList()) return
  criteriaList.value.splice(index, 1)
}

async function importTemplates() {
  if (criteriaSaving.value) {
    return
  }
  if (!criteriaTask.value || selectedTemplateIds.value.length === 0) {
    showFormValidationMessage('请选择要导入的模板')
    return
  }
  if (hasUnsavedCriteriaChanges.value) {
    showFormValidationMessage('当前条件有未保存修改，请先保存整表条件后再导入模板')
    return
  }
  criteriaSaving.value = true
  try {
    criteriaList.value = await portfolioTitlePromotionApi.copyTaskCriteriaFromTemplate({
      taskId: criteriaTask.value.id,
      templateIds: selectedTemplateIds.value,
    })
    criteriaBaseline.value = criteriaFingerprint()
    selectedTemplateIds.value = []
    message.success('模板已导入')
    await loadTasks()
  }
  catch (error) {
    showUserError(error, '导入模板失败')
  }
  finally {
    criteriaSaving.value = false
  }
}

async function saveDraftCriteriaReplace() {
  if (!criteriaTask.value) return
  if (criteriaTask.value.taskStatus !== PortfolioTitlePromotionTaskStatusCode.DRAFT) {
    showFormValidationMessage('仅草稿任务可常规保存条件')
    return
  }
  if (!validateCriteriaDraftList()) return
  criteriaSaving.value = true
  try {
    criteriaList.value = await portfolioTitlePromotionApi.replaceTaskCriteria({
      taskId: criteriaTask.value.id,
      criteriaItems: toCriteriaItems(),
    })
    criteriaBaseline.value = criteriaFingerprint()
    message.success('草稿条件已保存')
    await loadTasks()
  }
  catch (error) {
    showUserError(error, '保存条件失败')
  }
  finally {
    criteriaSaving.value = false
  }
}

async function emergencyReplaceCriteria() {
  if (!criteriaTask.value) return
  if (criteriaTask.value.taskStatus !== PortfolioTitlePromotionTaskStatusCode.PUBLISHED) {
    showFormValidationMessage('仅已发布任务可紧急修正')
    return
  }
  if (!emergencyReason.value.trim()) {
    showFormValidationMessage('紧急修正必须填写变更原因')
    return
  }
  if (!validateCriteriaDraftList()) return
  const confirmed = await confirmAsync({
    title: '确认紧急修正条件',
    content: `将对已发布任务「${criteriaTask.value.taskName}」修正条件（当前 ${criteriaList.value.length} 条）；草稿、退回补正及之后新申报按新条件核验，已进入审核流程的历史核验不重算。`,
    type: 'warning',
    okText: '确认修正',
  })
  if (!confirmed) return
  criteriaSaving.value = true
  try {
    criteriaList.value = await portfolioTitlePromotionApi.emergencyReplaceTaskCriteria({
      taskId: criteriaTask.value.id,
      changeReason: emergencyReason.value.trim(),
      criteriaItems: toCriteriaItems(),
    })
    criteriaBaseline.value = criteriaFingerprint()
    message.success('紧急修正已生效（草稿、退回补正及之后新申报）')
    emergencyReason.value = ''
    const logs = await portfolioTitlePromotionApi.pageTaskCriteriaChangeLog({
      taskId: criteriaTask.value.id,
      pageNum: 1,
      pageSize: 20,
    })
    changeLogs.value = logs.list || []
    await loadTasks()
  }
  catch (error) {
    showUserError(error, '紧急修正失败')
  }
  finally {
    criteriaSaving.value = false
  }
}

function openExpertReview(row: PortfolioTitlePromotionApplicationVO) {
  if (writing.value) return
  void openExpertReviewAsync(row)
}

async function openExpertReviewAsync(row: PortfolioTitlePromotionApplicationVO) {
  if (!row.id) return
  try {
    expertFlowLoading.value = true
    expertTarget.value = await portfolioTitlePromotionApi.getApplication(row.id)
    expertFlow.value = await portfolioTitlePromotionApi.getFlowView({
      applicationId: row.id,
      pathCode: expertTarget.value.pathCode,
      jobCategory: expertTarget.value.jobCategory,
    })
    expertForm.opinion = ''
    expertOpen.value = true
  }
  catch (error) {
    showUserError(error, '加载申报详情失败')
  }
  finally {
    expertFlowLoading.value = false
  }
}

function openPublicity(row: PortfolioTitlePromotionApplicationVO) {
  if (writing.value) return
  publicityTarget.value = row
  publicityForm.days = 7
  publicityForm.remark = ''
  publicityOpen.value = true
}

async function runExpertReview(approve: boolean) {
  if (!expertTarget.value) return
  const target = expertTarget.value
  const targetId = target.id
  if (!targetId) return
  const operation = `expert:${targetId}`
  if (!beginWorkflowOperation(operation)) return
  try {
    if (!approve) {
      if (!expertForm.opinion.trim()) {
        showFormValidationMessage('驳回专家评审必须填写意见')
        return
      }
      const confirmed = await confirmAsync({
        title: '确认驳回专家评审',
        content: `确认驳回申报单「${target.applicationNo}」？本次申报将终止。`,
        type: 'warning',
        okText: '确认驳回',
      })
      if (!confirmed) return
    }
    await portfolioTitlePromotionApi.expertReview({
      id: targetId,
      opinion: expertForm.opinion.trim() || undefined,
      approve,
    })
    message.success(approve ? '专家评审已通过' : '专家评审已驳回')
    expertOpen.value = false
    await loadApps()
  } catch (error) {
    showUserError(error, '专家评审失败')
  } finally {
    endWorkflowOperation(operation)
  }
}

async function runStartPublicity() {
  if (!publicityTarget.value) return
  if (!publicityForm.days || publicityForm.days < 1) {
    showFormValidationMessage('公示天数须至少为 1')
    return
  }
  const target = publicityTarget.value
  const targetId = target.id
  if (!targetId) return
  const operation = `publicity:${targetId}`
  if (!beginWorkflowOperation(operation)) return
  try {
    const confirmed = await confirmAsync({
      title: '确认发布职称公示',
      content: `确认发布申报单「${target.applicationNo}」的公示？公示期为 ${publicityForm.days} 天，发布后将进入正式公示流程。`,
      type: 'warning',
      okText: '确认发布公示',
    })
    if (!confirmed) return
    await portfolioTitlePromotionApi.startPublicity({
      id: targetId,
      days: publicityForm.days,
      remark: publicityForm.remark.trim() || undefined,
    })
    message.success('公示已发布')
    publicityOpen.value = false
    await loadApps()
  } catch (error) {
    showUserError(error, '发布公示失败')
  } finally {
    endWorkflowOperation(operation)
  }
}

async function runArchivePublicity(row: PortfolioTitlePromotionApplicationVO) {
  if (!row.id) return
  const operation = `archive:${row.id}`
  if (!beginWorkflowOperation(operation)) return
  try {
    const confirmed = await confirmAsync({
      title: '确认归档职称公示',
      content: `确认归档申报单「${row.applicationNo}」？归档后进入终态。`,
      type: 'warning',
      okText: '确认归档',
    })
    if (!confirmed) return
    await portfolioTitlePromotionApi.archivePublicity({ id: row.id })
    message.success('公示已归档')
    await loadApps()
  } catch (error) {
    showUserError(error, '归档失败')
  } finally {
    endWorkflowOperation(operation)
  }
}

function canArchivePublicity(row: PortfolioTitlePromotionApplicationVO) {
  if (row.applicationStatus !== PortfolioTitlePromotionApplicationStatusCode.PUBLICITY) return false
  if (!row.publicityEndTime) return false
  return new Date(row.publicityEndTime).getTime() <= Date.now()
}

function openReview(row: PortfolioTitlePromotionApplicationVO) {
  if (writing.value) return
  void openReviewAsync(row)
}

async function openReviewAsync(row: PortfolioTitlePromotionApplicationVO) {
  if (!row.id) return
  try {
    reviewFlowLoading.value = true
    reviewTarget.value = await portfolioTitlePromotionApi.getApplication(row.id)
    reviewFlow.value = await portfolioTitlePromotionApi.getFlowView({
      applicationId: row.id,
      pathCode: reviewTarget.value.pathCode,
      jobCategory: reviewTarget.value.jobCategory,
    })
    reviewForm.opinion = ''
    reviewOpen.value = true
  }
  catch (error) {
    showUserError(error, '加载申报详情失败')
  }
  finally {
    reviewFlowLoading.value = false
  }
}

async function runReview(
  action: 'collegeApprove' | 'collegeReturn' | 'hrApprove' | 'hrReturn' | 'hrReject',
) {
  if (!reviewTarget.value) return
  const target = reviewTarget.value
  const targetId = target.id
  if (!targetId) return
  const operation = `${action}:${targetId}`
  if (!beginWorkflowOperation(operation)) return
  try {
    const negativeAction
      = action === 'collegeReturn' || action === 'hrReturn' || action === 'hrReject'
    if (negativeAction && !reviewForm.opinion.trim()) {
      showFormValidationMessage('退回或驳回必须填写审核意见')
      return
    }
    if (negativeAction) {
      const actionLabel = action === 'hrReject' ? '驳回' : '退回'
      const confirmed = await confirmAsync({
        title: `确认${actionLabel}职称申报`,
        content:
          action === 'hrReject'
            ? `确认驳回申报单「${target.applicationNo}」？本次申报将终止。`
            : `确认退回申报单「${target.applicationNo}」？申请人需按意见修改后重新提交。`,
        type: 'warning',
        okText: `确认${actionLabel}`,
      })
      if (!confirmed) return
    }
    const payload = { id: targetId, opinion: reviewForm.opinion.trim() || undefined }
    switch (action) {
      case 'collegeApprove':
        await portfolioTitlePromotionApi.collegeApprove(payload)
        break
      case 'collegeReturn':
        await portfolioTitlePromotionApi.collegeReturn(payload)
        break
      case 'hrApprove':
        await portfolioTitlePromotionApi.hrApprove(payload)
        break
      case 'hrReturn':
        await portfolioTitlePromotionApi.hrReturn(payload)
        break
      case 'hrReject':
        await portfolioTitlePromotionApi.hrReject(payload)
        break
    }
    message.success('审核操作已完成')
    reviewOpen.value = false
    await loadApps()
  } catch (error) {
    showUserError(error, '审核失败')
  } finally {
    endWorkflowOperation(operation)
  }
}

function onTaskPageChange(page: { current: number, pageSize: number }) {
  taskQuery.pageNum = page.current
  taskQuery.pageSize = page.pageSize
  void loadTasks()
}

function onAppPageChange(page: { current: number, pageSize: number }) {
  appQuery.pageNum = page.current
  appQuery.pageSize = page.pageSize
  void loadApps()
}

onMounted(() => {
  if (canManageSchoolWorkflow.value) {
    void loadTasks()
  }
  void loadApps()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="职称申报辅助"
        subtitle="任务发布 · 匹配度核验"
      >
        <template #actions>
          <UiButton
            size="sm"
            v-if="canManageSchoolWorkflow && activeTab === 'task'"
            :disabled="writing"
            @click="openCreate"
          >
            新建任务
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <UiSectionTabs
        v-model="activeTab"
        :items="tabItems"
        compact
        divided
        class="title-promo__tabs"
      />
      <template v-if="canManageSchoolWorkflow && activeTab === 'task'">
        <UiSpin :spinning="taskLoading">
          <WorkbenchContextGateStrip
            v-if="!taskLoading && !tasks.length"
            tag="未配置"
            body="暂无职称申报任务，请先新建任务"
            cta-label="新建任务"
            @cta="openCreate"
          />
          <UiDataTable
            v-else
            v-model:current="taskQuery.pageNum"
            v-model:page-size="taskQuery.pageSize"
            :load-error="taskLoadError"
            row-key="id"
            :columns="taskColumns"
            :data-source="tasks"
            pagination-mode="server"
            :total="taskTotal"
            @page-change="onTaskPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'taskStatus'">
                <UiTag>{{ taskStatusLabel(record.taskStatus) }}</UiTag>
              </template>
              <template v-else-if="column.key === 'criteriaCount'">
                {{ (record.taskCriteria || []).length }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiButton
                  v-if="record.taskStatus === PortfolioTitlePromotionTaskStatusCode.DRAFT"
                  size="sm"
                  variant="soft"
                  :disabled="writing"
                  @click="openEdit(record)"
                >
                  编辑
                </UiButton>
                <UiButton
                  v-if="record.taskStatus === PortfolioTitlePromotionTaskStatusCode.DRAFT"
                  size="sm"
                  :disabled="writing"
                  @click="publishTask(record)"
                >
                  发布
                </UiButton>
                <UiButton
                  v-if="record.taskStatus === PortfolioTitlePromotionTaskStatusCode.PUBLISHED"
                  size="sm"
                  variant="soft"
                  :disabled="writing"
                  @click="closeTask(record)"
                >
                  关闭
                </UiButton>
                <UiButton
                  size="sm"
                  variant="soft"
                  :disabled="writing"
                  @click="openCriteria(record)"
                >
                  条件
                </UiButton>
              </template>
            </template>
          </UiDataTable>
        </UiSpin>
      </template>
      <template v-else-if="activeTab === 'application'">
        <div class="title-promo__filters">
          <UiSelect
            size="sm"
            v-model="appQuery.applicationStatus"
            allow-clear
            placeholder="申请状态"
            style="width: 180px"
            :options="statusOptions"
            @change="
              () => {
                appQuery.pageNum = 1
                void loadApps()
              }
            "
          />
        </div>
        <UiSpin :spinning="appLoading">
          <UiEmpty size="sm" v-if="!appLoading && !apps.length" description="暂无申报单" />
          <UiDataTable
            v-else
            v-model:current="appQuery.pageNum"
            v-model:page-size="appQuery.pageSize"
            :load-error="appLoadError"
            row-key="id"
            :columns="appColumns"
            :data-source="apps"
            pagination-mode="server"
            :total="appTotal"
            @page-change="onAppPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'redlineBlocked'">
                <UiTag :tone="record.redlineBlocked ? 'red' : 'green'">
                  {{ record.redlineBlocked ? '阻断' : '通过' }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'applicationStatus'">
                <UiTag>{{ appStatusLabel(record.applicationStatus) }}</UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiButton
                  size="sm"
                  variant="soft"
                  :disabled="!record.teacherUserId"
                  @click="goTeacherPortfolioPage('/portfolio/teacher/masterpiece', record.teacherUserId)"
                >
                  读整袋
                </UiButton>
                <UiButton
                  v-if="
                    record.applicationStatus
                      === PortfolioTitlePromotionApplicationStatusCode.COLLEGE_PENDING
                      || (canManageSchoolWorkflow
                        && record.applicationStatus
                          === PortfolioTitlePromotionApplicationStatusCode.HR_PENDING)
                  "
                  size="sm"
                  :disabled="writing"
                  @click="openReview(record)"
                >
                  审核
                </UiButton>
                <UiButton
                  v-if="
                    canManageSchoolWorkflow
                      && record.applicationStatus
                        === PortfolioTitlePromotionApplicationStatusCode.EXPERT_PENDING
                  "
                  size="sm"
                  :disabled="writing"
                  @click="openExpertReview(record)"
                >
                  专家评审
                </UiButton>
                <UiButton
                  v-if="
                    canManageSchoolWorkflow
                      && record.applicationStatus
                        === PortfolioTitlePromotionApplicationStatusCode.PUBLICITY
                      && !record.publicityStartTime
                  "
                  size="sm"
                  :disabled="writing"
                  @click="openPublicity(record)"
                >
                  发布公示
                </UiButton>
                <UiButton
                  v-if="canManageSchoolWorkflow && canArchivePublicity(record)"
                  size="sm"
                  variant="soft"
                  :disabled="writing"
                  @click="runArchivePublicity(record)"
                >
                  归档
                </UiButton>
              </template>
            </template>
          </UiDataTable>
        </UiSpin>
      </template>
    </UiCard>

    <UiDrawer
      v-model:open="editorOpen"
      :title="editingId ? '编辑职称评审任务' : '新建职称评审任务'"
      width="480"
    >
      <div class="title-promo__form">
        <label>任务名称</label>
        <UiInput size="sm" v-model="form.taskName" />
        <label>目标职称层级</label>
        <UiInput size="sm" v-model="form.targetTitleLevel" placeholder="如：副教授" />
        <label>评审年度</label>
        <UiInput size="sm" v-model="form.reviewYear" />
        <p class="text-sm text-[var(--dp-text-secondary)]">
          资格条件请在任务发布前通过「条件编辑/模板导入」配置；保存草稿任务会自动种子硬门槛三件套。
        </p>
      </div>
      <template #footer>
        <UiButton size="sm" variant="soft" @click="editorOpen = false"> 取消 </UiButton>
        <UiButton size="sm" variant="primary" :loading="saving" @click="saveTask"> 保存 </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer v-model:open="reviewOpen" title="审核申报" width="640">
      <div v-if="reviewTarget" class="title-promo__form">
        <TitlePromotionFlowPanel :flow="reviewFlow" :loading="reviewFlowLoading" />
        <div class="title-promo__actions" style="margin-bottom: 12px">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!reviewTarget.teacherUserId"
            @click="goTeacherPortfolioPage('/portfolio/teacher/masterpiece', reviewTarget.teacherUserId)"
          >
            读整袋
          </UiButton>
        </div>
        <p>{{ reviewTarget.taskName }} · {{ reviewTarget.applicationNo }}</p>
        <p>
          路径 {{
            reviewTarget.pathCode
              ? strictEnumLabel(PortfolioTitleCriteriaPathDescription, reviewTarget.pathCode, '申报路径')
              : '-'
          }}
          · 岗位 {{
            reviewTarget.jobCategory
              ? strictEnumLabel(PortfolioTitleJobCategoryDescription, reviewTarget.jobCategory, '岗位类型')
              : '全部'
          }}
        </p>
        <p>
          匹配度 {{ reviewTarget.matchScore }} · 硬性 {{ reviewTarget.hardRate }} · 材料
          {{ reviewTarget.materialRate }} · 业绩 {{ reviewTarget.performanceRate }}
        </p>
        <ul class="title-promo__match">
          <li v-for="item in reviewTarget.criteriaResults || []" :key="item.taskCriteriaId">
            <UiTag :tone="item.satisfied ? 'green' : 'red'" size="sm">
              {{ item.satisfied ? '满足' : '不满足' }}
            </UiTag>
            {{ item.criteriaTitle }}：{{ item.evidenceSummary }}
            <span v-if="item.blockOnFail && !item.satisfied"> · 阻断项</span>
            <div v-if="item.criteriaDescription" class="title-promo__match-desc">
              {{ item.criteriaDescription }}
            </div>
            <div v-if="item.gapHint" class="title-promo__match-gap">
              {{ item.gapHint }}
            </div>
          </li>
        </ul>
        <label>审核意见</label>
        <UiTextarea size="sm" v-model="reviewForm.opinion" :rows="3" />
        <div class="title-promo__actions">
          <template
            v-if="
              reviewTarget.applicationStatus
                === PortfolioTitlePromotionApplicationStatusCode.COLLEGE_PENDING
            "
          >
            <UiButton size="sm" variant="primary" :disabled="writing" @click="runReview('collegeApprove')"> 院审通过 </UiButton>
            <UiButton size="sm" variant="soft" :disabled="writing" @click="runReview('collegeReturn')">
              院审退回
            </UiButton>
          </template>
          <template
            v-else-if="
              canManageSchoolWorkflow
                && reviewTarget.applicationStatus
                  === PortfolioTitlePromotionApplicationStatusCode.HR_PENDING
            "
          >
            <UiButton size="sm" variant="primary" :disabled="writing" @click="runReview('hrApprove')"> 人事复审通过 </UiButton>
            <UiButton size="sm" variant="soft" :disabled="writing" @click="runReview('hrReturn')">
              人事退回
            </UiButton>
            <UiButton size="sm" variant="soft" :disabled="writing" @click="runReview('hrReject')">
              驳回
            </UiButton>
          </template>
        </div>
      </div>
    </UiDrawer>

    <UiDrawer v-model:open="expertOpen" title="专家评审" width="640">
      <div v-if="expertTarget" class="title-promo__form">
        <TitlePromotionFlowPanel :flow="expertFlow" :loading="expertFlowLoading" />
        <div class="title-promo__actions" style="margin-bottom: 12px">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!expertTarget.teacherUserId"
            @click="goTeacherPortfolioPage('/portfolio/teacher/masterpiece', expertTarget.teacherUserId)"
          >
            读整袋
          </UiButton>
        </div>
        <p>{{ expertTarget.taskName }} · {{ expertTarget.applicationNo }}</p>
        <p>
          路径 {{
            expertTarget.pathCode
              ? strictEnumLabel(PortfolioTitleCriteriaPathDescription, expertTarget.pathCode, '申报路径')
              : '-'
          }}
          · 岗位 {{
            expertTarget.jobCategory
              ? strictEnumLabel(PortfolioTitleJobCategoryDescription, expertTarget.jobCategory, '岗位类型')
              : '全部'
          }}
        </p>
        <p>
          匹配度 {{ expertTarget.matchScore }} · 硬性 {{ expertTarget.hardRate }} · 材料
          {{ expertTarget.materialRate }} · 业绩 {{ expertTarget.performanceRate }}
        </p>
        <ul class="title-promo__match">
          <li v-for="item in expertTarget.criteriaResults || []" :key="item.taskCriteriaId">
            <UiTag :tone="item.satisfied ? 'green' : 'red'" size="sm">
              {{ item.satisfied ? '满足' : '不满足' }}
            </UiTag>
            {{ item.criteriaTitle }}：{{ item.evidenceSummary }}
            <span v-if="item.blockOnFail && !item.satisfied"> · 阻断项</span>
            <div v-if="item.criteriaDescription" class="title-promo__match-desc">
              {{ item.criteriaDescription }}
            </div>
            <div v-if="item.gapHint" class="title-promo__match-gap">
              {{ item.gapHint }}
            </div>
          </li>
        </ul>
        <label>专家意见</label>
        <UiTextarea size="sm" v-model="expertForm.opinion" :rows="3" />
        <div class="title-promo__actions">
          <UiButton size="sm" variant="primary" :disabled="writing" @click="runExpertReview(true)"> 通过并进入公示 </UiButton>
          <UiButton size="sm" variant="soft" :disabled="writing" @click="runExpertReview(false)">
            驳回
          </UiButton>
        </div>
      </div>
    </UiDrawer>

    <UiDrawer v-model:open="publicityOpen" title="发布公示" width="480">
      <div v-if="publicityTarget" class="title-promo__form">
        <p>{{ publicityTarget.taskName }} · {{ publicityTarget.applicationNo }}</p>
        <label>公示天数</label>
        <UiInputNumber size="sm" v-model="publicityForm.days" :min="1" />
        <label>公示说明</label>
        <UiTextarea size="sm" v-model="publicityForm.remark" :rows="3" />
        <div class="title-promo__actions">
          <UiButton
            size="sm"
            :disabled="writing"
            :loading="operationKey.startsWith('publicity:')"
            @click="runStartPublicity"
          >
            发布公示
          </UiButton>
        </div>
      </div>
    </UiDrawer>

    <UiDrawer v-model:open="criteriaOpen" title="任务资格条件" width="860">
      <div v-if="criteriaTask" class="title-promo__form">
        <p>{{ criteriaTask.taskName }} · {{ criteriaTask.taskStatus }} · 共 {{ criteriaList.length }} 条</p>
        <UiSpin :spinning="criteriaLoading || criteriaSaving">
          <div
            v-if="criteriaTask.taskStatus === PortfolioTitlePromotionTaskStatusCode.DRAFT"
            class="mb-3 flex flex-col gap-2"
          >
            <label>从模板导入</label>
            <UiSelect
              size="sm"
              v-model="selectedTemplateIds"
              mode="multiple"
              allow-clear
              placeholder="选择启用中的条件模板"
              :options="availableCriteriaTemplates.map(item => ({ value: item.id, label: `${item.templateCode} ${item.templateTitle}` }))"
            />
            <div class="title-promo__actions">
              <UiButton size="sm" :loading="criteriaSaving" @click="importTemplates">
                导入模板
              </UiButton>
              <UiButton size="sm" @click="addCriteriaRow">
                新增条件行
              </UiButton>
              <UiButton variant="primary" size="sm" :loading="criteriaSaving" @click="saveDraftCriteriaReplace">
                保存整表条件
              </UiButton>
            </div>
          </div>
          <div
            v-else-if="criteriaTask.taskStatus === PortfolioTitlePromotionTaskStatusCode.PUBLISHED"
            class="mb-3 title-promo__actions"
          >
            <UiButton size="sm" @click="addCriteriaRow">
              新增条件行
            </UiButton>
          </div>
          <div class="mb-3 flex flex-col gap-3">
            <div
              v-for="(item, index) in criteriaList"
              :key="item.id || `${item.criteriaCode}-${index}`"
              class="rounded border border-[var(--dp-border)] p-3 text-sm"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <strong>条件 {{ index + 1 }}</strong>
                <UiButton
                  v-if="canEditCriteriaList()"
                  size="sm"
                  status="danger"
                  variant="outline"
                  @click="removeCriteriaRow(index)"
                >
                  删除
                </UiButton>
              </div>
              <div class="title-promo__criteria-grid">
                <label>编码</label>
                <UiInput size="sm" v-model="item.criteriaCode" :disabled="!canEditCriteriaList()" />
                <label>标题</label>
                <UiInput size="sm" v-model="item.criteriaTitle" :disabled="!canEditCriteriaList()" />
                <label>门槛</label>
                <UiSelect
                  size="sm"
                  v-model="item.gateKind"
                  :options="gateKindOptions"
                  :disabled="!canEditCriteriaList()"
                  @change="() => {
                    if (item.gateKind === PortfolioTitleCriteriaGateKindCode.HARD) {
                      item.blockOnFail = true
                    }
                  }"
                />
                <label>核验类型</label>
                <UiSelect
                  size="sm"
                  v-model="item.checkType"
                  :options="checkTypeOptions"
                  :disabled="!canEditCriteriaList()"
                  allow-search
                  option-filter-prop="label"
                />
                <label>满足模式</label>
                <UiSelect
                  size="sm"
                  v-model="item.satisfyMode"
                  :options="satisfyModeOptions"
                  :disabled="!canEditCriteriaList()"
                  @change="() => {
                    if (item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ALL) {
                      item.groupCode = undefined
                    }
                    if (item.satisfyMode !== PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP) {
                      item.groupMinimumCount = undefined
                    }
                  }"
                />
                <label>路径</label>
                <UiSelect
                  size="sm"
                  v-model="item.pathCode"
                  :options="pathCodeOptions"
                  :disabled="!canEditCriteriaList()"
                />
                <label>组编码</label>
                <UiInput size="sm" v-model="item.groupCode" :disabled="!canEditCriteriaList()" placeholder="组满足模式时必填" />
                <template v-if="item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP">
                  <label>组内最低满足条数</label>
                  <UiInputNumber
                    size="sm"
                    v-model="item.groupMinimumCount"
                    :min="1"
                    :precision="0"
                   
                    :disabled="!canEditCriteriaList()"
                  />
                </template>
                <label>岗位类型</label>
                <UiSelect
                  size="sm"
                  v-model="item.jobCategory"
                  :options="jobCategoryOptions"
                  :disabled="!canEditCriteriaList()"
                  allow-clear
                  placeholder="空=全部岗位"
                />
                <label>单条核验阈值</label>
                <UiInput size="sm" v-model="item.expectedValue" :disabled="!canEditCriteriaList()" placeholder="数量/学时/年限/级别" />
                <label>证据档案分类</label>
                <UiSelect
                  size="sm"
                  v-model="item.evidenceCategoryCode"
                  :options="criteriaCategoryOptions"
                  :disabled="!canEditCriteriaList()"
                  allow-clear
                  allow-search
                  option-filter-prop="label"
                  placeholder="按材料类型核验时选择"
                />
                <label>排序</label>
                <UiInputNumber size="sm" v-model="item.sortNo" :min="0" :disabled="!canEditCriteriaList()" />
              </div>
              <label class="mt-2 block">说明文案</label>
              <UiTextarea
                size="sm"
                v-model="item.criteriaDescription"
                :rows="2"
                :disabled="!canEditCriteriaList()"
                placeholder="教师端核验清单展示"
              />
              <label class="mt-2 flex items-center gap-2">
                <input
                  v-model="item.blockOnFail"
                  type="checkbox"
                  :disabled="!canEditCriteriaList() || item.gateKind === PortfolioTitleCriteriaGateKindCode.HARD"
                  @change="() => {
                    if (item.gateKind === PortfolioTitleCriteriaGateKindCode.HARD) {
                      item.blockOnFail = true
                    }
                  }"
                >
                不满足时阻断提交{{ item.gateKind === PortfolioTitleCriteriaGateKindCode.HARD ? '（硬门槛强制）' : '' }}
              </label>
            </div>
            <UiEmpty size="sm" v-if="!criteriaList.length" description="暂无条件，请导入模板或新增" />
          </div>
          <div
            v-if="criteriaTask.taskStatus === PortfolioTitlePromotionTaskStatusCode.PUBLISHED"
            class="flex flex-col gap-2"
          >
            <label>紧急修正原因（必填）</label>
            <UiTextarea size="sm" v-model="emergencyReason" :rows="3" placeholder="说明为何修正条件（阳光评审审计）" />
            <UiButton size="sm" variant="primary" :loading="criteriaSaving" @click="emergencyReplaceCriteria">
              提交紧急修正
            </UiButton>
            <label>修正历史</label>
            <div
              v-for="log in changeLogs"
              :key="log.id"
              class="rounded border border-[var(--dp-border)] p-2 text-sm"
            >
              <div>{{ log.createTime }} · 前 {{ log.beforeCriteriaCount }} → 后 {{ log.afterCriteriaCount }}</div>
              <div>{{ log.changeReason }}</div>
              <div
                v-for="entry in log.items || []"
                :key="entry.id"
                class="text-xs text-[var(--dp-text-secondary)]"
              >
                {{ strictEnumLabel(PortfolioTitleCriteriaChangeActionDescription, entry.changeAction, '变更动作') }}
                {{ entry.criteriaCode }} {{ entry.criteriaTitle }}
                <span v-if="entry.changeNote"> · {{ entry.changeNote }}</span>
              </div>
            </div>
          </div>
        </UiSpin>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.title-promo__filters {
  margin-bottom: 12px;
}
.title-promo__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.title-promo__form label {
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.title-promo__match {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  line-height: 1.6;
}
.title-promo__match-desc {
  margin-top: 2px;
  color: var(--dp-text-secondary);
  font-size: 12px;
}
.title-promo__match-gap {
  margin-top: 2px;
  color: var(--dp-danger);
  font-size: 12px;
}
.title-promo__criteria-grid {
  display: grid;
  grid-template-columns: 72px 1fr 72px 1fr;
  gap: 8px 10px;
  align-items: center;
}
.title-promo__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.w-full {
  width: 100%;
}
</style>
