<script setup lang="ts">
import type {
  PortfolioTitleEvidenceCandidateVO,
  PortfolioTitleEvidenceItem,
  PortfolioTitlePromotionApplicationVO,
  PortfolioTitlePromotionFlowViewVO,
  PortfolioTitlePromotionTaskVO,
  PortfolioTitleTaskCriteriaVO,
} from '@/apis/portfolio/title-promotion'
import type { PortfolioTitleJobCategoryCode } from '@/types/enums/portfolio-title-job-category-enum'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioTitlePromotionApi } from '@/apis/portfolio/title-promotion'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import TitlePromotionFlowPanel from '@/components/portfolio/TitlePromotionFlowPanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import {
  PortfolioTitleCriteriaCheckTypeCode,
  PortfolioTitleCriteriaCheckTypeDescription,
} from '@/types/enums/portfolio-title-criteria-check-type-enum'
import { PortfolioTitleCriteriaGateKindDescription } from '@/types/enums/portfolio-title-criteria-gate-kind-enum'
import { PortfolioTitleCriteriaPathCode } from '@/types/enums/portfolio-title-criteria-path-code-enum'
import { PortfolioTitleCriteriaSatisfyModeCode } from '@/types/enums/portfolio-title-criteria-satisfy-mode-enum'
import { PortfolioTitleEvidenceTypeCode } from '@/types/enums/portfolio-title-evidence-type-enum'
import { PortfolioTitleJobCategoryDescription } from '@/types/enums/portfolio-title-job-category-enum'
import {
  PortfolioTitlePromotionApplicationStatusCode,
  PortfolioTitlePromotionApplicationStatusDescription,
} from '@/types/enums/portfolio-title-promotion-application-status-enum'
import { PortfolioTitlePromotionTaskStatusCode } from '@/types/enums/portfolio-title-promotion-task-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()
const route = useRoute()
const router = useRouter()

/** PF-P0-299：解析 route query 字符串参数（applicationId / taskId / teacherId）。 */
function readRouteStringParam(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

/** 深链设置 selectedTaskId 时抑制 watch 清空表单。 */
const suppressTaskWatch = ref(false)
function goMasterpiecePreview() {
  void router.push({
    path: '/portfolio/teacher/masterpiece',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}
const loading = ref(false)
const matchLoading = ref(false)
const draftLoading = ref(false)
const submitLoading = ref(false)
const publishedTasks = ref<PortfolioTitlePromotionTaskVO[]>([])
const selectedTaskId = ref<string | undefined>()
const pathCode = ref(PortfolioTitleCriteriaPathCode.NORMAL)
const jobCategory = ref<PortfolioTitleJobCategoryCode | undefined>()
const commitmentConfirmed = ref(false)
const selectionConfirmed = ref(false)
const evidenceByCriteria = ref<Record<string, string[]>>({})
const manualNoteByCriteria = ref<Record<string, string>>({})
const evidenceOptionsByCriteria = ref<Record<string, Array<{ value: string, label: string }>>>({})
const evidenceLoadingByCriteria = ref<Record<string, boolean>>({})
const evidenceRequestTokenByCriteria = ref<Record<string, number>>({})
const matchResult = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const applicationId = ref<string | undefined>()
const flowView = ref<PortfolioTitlePromotionFlowViewVO | null>(null)
const flowLoading = ref(false)
const taskRequestToken = ref(0)
const applicationRequestToken = ref(0)
const flowRequestToken = ref(0)
/** 教师/任务切换时递增；保存/提交响应必须同代际。 */
const applicationFormEpoch = ref(0)
/** 核验预览代际；条件变化使旧预览失效。 */
const matchPreviewToken = ref(0)
const formWritePending = computed(
  () => matchLoading.value || draftLoading.value || submitLoading.value,
)

const selectedTask = computed(() =>
  publishedTasks.value.find((item) => item.id === selectedTaskId.value),
)
const taskCriteria = computed<PortfolioTitleTaskCriteriaVO[]>(() => {
  const list = selectedTask.value?.taskCriteria || []
  return list.filter((item) => {
    const pathOk
      = item.pathCode === PortfolioTitleCriteriaPathCode.COMMON || item.pathCode === pathCode.value
    const jobOk = !item.jobCategory || item.jobCategory === jobCategory.value
    return pathOk && jobOk
  })
})
const jobOptions = computed(() => {
  const set = new Set<PortfolioTitleJobCategoryCode>()
  for (const item of selectedTask.value?.taskCriteria || []) {
    const pathOk
      = item.pathCode === PortfolioTitleCriteriaPathCode.COMMON || item.pathCode === pathCode.value
    if (pathOk && item.jobCategory) {
      set.add(item.jobCategory)
    }
  }
  return [...set].map((value) => ({
    value,
    label: strictEnumLabel(PortfolioTitleJobCategoryDescription, value, '岗位类型'),
  }))
})
const applicationEditable = computed(
  () =>
    !matchResult.value?.id
    || [
      PortfolioTitlePromotionApplicationStatusCode.DRAFT,
      PortfolioTitlePromotionApplicationStatusCode.COLLEGE_RETURNED,
      PortfolioTitlePromotionApplicationStatusCode.HR_RETURNED,
    ].includes(matchResult.value.applicationStatus),
)
const jobRequired = computed(() =>
  applicationEditable.value ? jobOptions.value.length > 0 : Boolean(matchResult.value?.jobCategory),
)
const commitmentRequired = computed(() =>
  applicationEditable.value
    ? taskCriteria.value.some(
        (item) => item.checkType === PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED,
      )
    : Boolean(
        matchResult.value?.criteriaResults?.some(
          (item) => item.checkType === PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED,
        ),
      ),
)
const pathCodeOptions = [
  { value: PortfolioTitleCriteriaPathCode.NORMAL, label: '正常路径' },
  { value: PortfolioTitleCriteriaPathCode.EXCEPTION, label: '破格路径' },
]

const taskOptions = computed(() =>
  publishedTasks.value.map((task) => ({
    value: task.id,
    label: `${task.taskName}（${task.targetTitleLevel} · ${task.reviewYear}）`,
  })),
)
function evidenceOptionsForCriteria(criteria: PortfolioTitleTaskCriteriaVO) {
  return evidenceOptionsByCriteria.value[criteria.id] || []
}

function isEvidenceLoading(criteriaId: string): boolean {
  return Boolean(evidenceLoadingByCriteria.value[criteriaId])
}

function mergeEvidenceOptions(
  criteriaId: string,
  candidates: PortfolioTitleEvidenceCandidateVO[],
): Array<{ value: string, label: string }> {
  const byValue = new Map<string, { value: string, label: string }>()
  for (const item of candidates) {
    byValue.set(item.recordId, {
      value: item.recordId,
      label: item.displayLabel,
    })
  }
  for (const selectedId of evidenceByCriteria.value[criteriaId] || []) {
    if (!byValue.has(selectedId)) {
      byValue.set(selectedId, {
        value: selectedId,
        label: `已选正式档案 · ${selectedId}`,
      })
    }
  }
  return [...byValue.values()]
}

/** 按条件分页拉取正式档案证据候选；保留已选项。 */
async function loadEvidenceCandidates(criteriaId: string, keyword?: string) {
  if (!targetTeacherId.value) {
    evidenceOptionsByCriteria.value = {
      ...evidenceOptionsByCriteria.value,
      [criteriaId]: mergeEvidenceOptions(criteriaId, []),
    }
    return
  }
  const nextToken = (evidenceRequestTokenByCriteria.value[criteriaId] || 0) + 1
  evidenceRequestTokenByCriteria.value = {
    ...evidenceRequestTokenByCriteria.value,
    [criteriaId]: nextToken,
  }
  evidenceLoadingByCriteria.value = {
    ...evidenceLoadingByCriteria.value,
    [criteriaId]: true,
  }
  try {
    const page = await portfolioTitlePromotionApi.pageEvidenceCandidates({
      pageNum: 1,
      pageSize: 50,
      teacherId: targetTeacherId.value,
      taskCriteriaId: criteriaId,
      keyword: keyword?.trim() || undefined,
    })
    if (evidenceRequestTokenByCriteria.value[criteriaId] !== nextToken) {
      return
    }
    evidenceOptionsByCriteria.value = {
      ...evidenceOptionsByCriteria.value,
      [criteriaId]: mergeEvidenceOptions(criteriaId, page.list || []),
    }
  } catch (error) {
    if (evidenceRequestTokenByCriteria.value[criteriaId] !== nextToken) {
      return
    }
    showUserError(error, '加载证据候选失败')
  } finally {
    if (evidenceRequestTokenByCriteria.value[criteriaId] === nextToken) {
      evidenceLoadingByCriteria.value = {
        ...evidenceLoadingByCriteria.value,
        [criteriaId]: false,
      }
    }
  }
}

async function refreshEvidenceForVisibleCriteria() {
  const selectable = taskCriteria.value.filter(isEvidenceSelectable)
  await Promise.all(selectable.map((item) => loadEvidenceCandidates(item.id)))
}

function handleEvidenceSearch(criteriaId: string, keyword: string) {
  void loadEvidenceCandidates(criteriaId, keyword)
}

function formatGroupHint(criteria: PortfolioTitleTaskCriteriaVO): string | undefined {
  if (!criteria.groupCode) {
    return undefined
  }
  if (criteria.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP) {
    return `组「${criteria.groupCode}」：任选其一`
  }
  if (criteria.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP) {
    return (
      '组「' + criteria.groupCode + '」：至少满足 ' + (criteria.groupMinimumCount || 'N') + ' 项'
    )
  }
  return undefined
}

function isEvidenceSelectable(criteria: PortfolioTitleTaskCriteriaVO): boolean {
  return (
    !criteria.autoEvaluable
    && criteria.checkType !== PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED
    && criteria.checkType !== PortfolioTitleCriteriaCheckTypeCode.MANUAL_CHECK
  )
}

function isManualCheck(criteria: PortfolioTitleTaskCriteriaVO): boolean {
  return criteria.checkType === PortfolioTitleCriteriaCheckTypeCode.MANUAL_CHECK
}

function buildEvidenceItems(): PortfolioTitleEvidenceItem[] {
  const items: PortfolioTitleEvidenceItem[] = []
  for (const criteria of taskCriteria.value) {
    if (isManualCheck(criteria)) {
      const note = (manualNoteByCriteria.value[criteria.id] || '').trim()
      if (note) {
        items.push({
          taskCriteriaId: criteria.id,
          evidenceType: PortfolioTitleEvidenceTypeCode.MANUAL_NOTE,
          evidenceNote: note,
        })
      }
      continue
    }
    if (!isEvidenceSelectable(criteria)) {
      continue
    }
    const selected = evidenceByCriteria.value[criteria.id] || []
    for (const refId of selected) {
      items.push({
        taskCriteriaId: criteria.id,
        evidenceType: PortfolioTitleEvidenceTypeCode.OFFICIAL_RECORD,
        evidenceRefId: refId,
      })
    }
  }
  if (commitmentConfirmed.value) {
    const commitment = taskCriteria.value.find(
      (item) => item.checkType === PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED,
    )
    if (commitment) {
      items.push({
        taskCriteriaId: commitment.id,
        evidenceType: PortfolioTitleEvidenceTypeCode.COMMITMENT,
      })
    }
  }
  return items
}

function applyApplicationToForm(app: PortfolioTitlePromotionApplicationVO) {
  applicationId.value = app.id
  if (
    app.pathCode === PortfolioTitleCriteriaPathCode.EXCEPTION
    || app.pathCode === PortfolioTitleCriteriaPathCode.NORMAL
  ) {
    pathCode.value = app.pathCode
  }
  jobCategory.value = app.jobCategory
  commitmentConfirmed.value = Boolean(app.commitmentConfirmed)
  selectionConfirmed.value = Boolean(app.selectionConfirmed)
  const nextEvidence: Record<string, string[]> = {}
  const nextNotes: Record<string, string> = {}
  for (const item of app.evidenceItems || []) {
    if (item.evidenceType === PortfolioTitleEvidenceTypeCode.MANUAL_NOTE) {
      nextNotes[item.taskCriteriaId] = item.evidenceNote || ''
      continue
    }
    if (
      item.evidenceType === PortfolioTitleEvidenceTypeCode.OFFICIAL_RECORD
      && item.evidenceRefId
    ) {
      const list = nextEvidence[item.taskCriteriaId] || []
      list.push(item.evidenceRefId)
      nextEvidence[item.taskCriteriaId] = list
    }
  }
  evidenceByCriteria.value = nextEvidence
  manualNoteByCriteria.value = nextNotes
  matchResult.value = app
}

/**
 * 加载教师当前任务下的申报单；优先消费 route.applicationId 深链（PF-P0-299）。
 */
async function loadExistingApplication() {
  if (!targetTeacherId.value) {
    applicationId.value = undefined
    matchResult.value = null
    evidenceByCriteria.value = {}
    manualNoteByCriteria.value = {}
    return
  }
  const currentToken = ++applicationRequestToken.value
  try {
    const deepLinkedApplicationId = readRouteStringParam(route.query.applicationId)
    if (deepLinkedApplicationId) {
      const detail = await portfolioTitlePromotionApi.getApplication(deepLinkedApplicationId)
      if (applicationRequestToken.value !== currentToken) {
        return
      }
      if (detail.teacherUserId !== targetTeacherId.value) {
        showFormValidationMessage('深链申报单与当前目标教师不一致，已忽略该申报单')
      } else {
        if (detail.taskId && selectedTaskId.value !== detail.taskId) {
          suppressTaskWatch.value = true
          selectedTaskId.value = detail.taskId
          suppressTaskWatch.value = false
        }
        applyApplicationToForm(detail)
        await loadFlowView()
        return
      }
    }
    if (!selectedTaskId.value) {
      applicationId.value = undefined
      matchResult.value = null
      evidenceByCriteria.value = {}
      manualNoteByCriteria.value = {}
      return
    }
    const detail = await portfolioTitlePromotionApi.getMineByTask({
      taskId: selectedTaskId.value,
      teacherUserId: targetTeacherId.value,
    })
    if (applicationRequestToken.value !== currentToken) {
      return
    }
    if (!detail?.id) {
      applicationId.value = undefined
      matchResult.value = null
      evidenceByCriteria.value = {}
      manualNoteByCriteria.value = {}
      return
    }
    applyApplicationToForm(detail)
    await loadFlowView()
  } catch (error) {
    showUserError(error, '加载已有申报单失败')
  }
}

async function loadFlowView() {
  if (!selectedTaskId.value) {
    flowView.value = null
    return
  }
  if (jobRequired.value && !jobCategory.value) {
    flowView.value = null
    return
  }
  const currentToken = ++flowRequestToken.value
  flowLoading.value = true
  try {
    const result = await portfolioTitlePromotionApi.getFlowView({
      applicationId: applicationId.value,
      taskId: selectedTaskId.value,
      pathCode: pathCode.value,
      jobCategory: jobCategory.value,
    })
    if (flowRequestToken.value !== currentToken) {
      return
    }
    flowView.value = result
  } catch (error) {
    if (flowRequestToken.value !== currentToken) {
      return
    }
    flowView.value = null
    showUserError(error, '加载评审流程失败')
  } finally {
    if (flowRequestToken.value === currentToken) {
      flowLoading.value = false
    }
  }
}

function buildRequestPayload() {
  if (!selectedTaskId.value) {
    throw new Error('请选择申报任务')
  }
  if (jobRequired.value && !jobCategory.value) {
    throw new Error('请选择岗位类型')
  }
  return {
    id: applicationId.value,
    taskId: selectedTaskId.value,
    teacherUserId: targetTeacherId.value,
    pathCode: pathCode.value,
    jobCategory: jobCategory.value,
    commitmentConfirmed: commitmentConfirmed.value,
    selectionConfirmed: selectionConfirmed.value,
    evidenceItems: buildEvidenceItems(),
  }
}

/** 核验预览指纹：任务/路径/岗位/证据/承诺任一变化即失效旧结果。 */
function evidenceFingerprint(): string {
  const evidenceParts = Object.keys(evidenceByCriteria.value)
    .sort()
    .map((key) => `${key}:${(evidenceByCriteria.value[key] || []).slice().sort().join(',')}`)
  const noteParts = Object.keys(manualNoteByCriteria.value)
    .sort()
    .map((key) => `${key}:${manualNoteByCriteria.value[key] || ''}`)
  return [
    targetTeacherId.value || '',
    selectedTaskId.value || '',
    pathCode.value,
    jobCategory.value || '',
    commitmentConfirmed.value ? '1' : '0',
    selectionConfirmed.value ? '1' : '0',
    applicationId.value || '',
    evidenceParts.join('|'),
    noteParts.join('|'),
  ].join('::')
}

function bumpApplicationFormEpoch(): void {
  applicationFormEpoch.value += 1
  matchPreviewToken.value += 1
}

/** 单页拉取开放窗口内已发布任务；深链 taskId 走 locate 定位。 */
async function loadPublishedTasks() {
  const currentToken = ++taskRequestToken.value
  try {
    const locateTaskId = readRouteStringParam(route.query.taskId) || undefined
    const page = await portfolioTitlePromotionApi.pageTask({
      pageNum: 1,
      pageSize: 50,
      taskStatus: PortfolioTitlePromotionTaskStatusCode.PUBLISHED,
      activeWindowOnly: true,
      locateTaskId,
    })
    if (taskRequestToken.value !== currentToken) {
      return
    }
    const list = page.list || []
    publishedTasks.value = list
    if (!selectedTaskId.value && list.length > 0) {
      if (locateTaskId && list.some((item) => item.id === locateTaskId)) {
        selectedTaskId.value = locateTaskId
      } else {
        selectedTaskId.value = list[0].id
      }
    }
  } catch (error) {
    showUserError(error, '加载申报任务失败')
  }
}

async function previewMatch() {
  if (!applicationEditable.value) {
    showFormValidationMessage('申报已进入审核流程，当前仅可查看提交快照')
    return
  }
  if (selectedTask.value && selectedTask.value.withinApplyWindow === false) {
    showFormValidationMessage('当前不在申报受理时间窗内，无法预览核验')
    return
  }
  if (formWritePending.value) {
    return
  }
  let payload: ReturnType<typeof buildRequestPayload>
  try {
    payload = buildRequestPayload()
  } catch (error) {
    if (error instanceof Error) {
      showFormValidationMessage(error.message)
    }
    return
  }
  const context = {
    token: ++matchPreviewToken.value,
    fingerprint: evidenceFingerprint(),
    epoch: applicationFormEpoch.value,
    teacherId: targetTeacherId.value,
  }
  try {
    matchLoading.value = true
    const result = await portfolioTitlePromotionApi.previewMatch(payload)
    if (
      matchPreviewToken.value !== context.token
      || applicationFormEpoch.value !== context.epoch
      || targetTeacherId.value !== context.teacherId
      || evidenceFingerprint() !== context.fingerprint
    ) {
      return
    }
    matchResult.value = result
  } catch (error) {
    if (
      matchPreviewToken.value !== context.token
      || applicationFormEpoch.value !== context.epoch
    ) {
      return
    }
    if (error instanceof Error && !('response' in error)) {
      showFormValidationMessage(error.message)
      return
    }
    showUserError(error, '预览核验失败')
  } finally {
    if (matchPreviewToken.value === context.token) {
      matchLoading.value = false
    }
  }
}

async function saveDraft() {
  if (draftLoading.value || submitLoading.value || matchLoading.value) {
    return
  }
  if (!applicationEditable.value) {
    showFormValidationMessage('申报已进入审核流程，当前不可修改材料')
    return
  }
  if (selectedTask.value && selectedTask.value.withinApplyWindow === false) {
    showFormValidationMessage('当前不在申报受理时间窗内，无法保存草稿')
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  let payload: ReturnType<typeof buildRequestPayload>
  try {
    payload = buildRequestPayload()
  } catch (error) {
    if (error instanceof Error) {
      showFormValidationMessage(error.message)
    }
    return
  }
  const context = {
    epoch: applicationFormEpoch.value,
    teacherId: targetTeacherId.value,
    payload,
  }
  if (!(await confirmProxyWrite('保存职称申报草稿'))) {
    return
  }
  if (
    applicationFormEpoch.value !== context.epoch
    || targetTeacherId.value !== context.teacherId
  ) {
    showFormValidationMessage('申报范围已切换，请重新保存草稿')
    return
  }
  try {
    draftLoading.value = true
    const result = await portfolioTitlePromotionApi.saveDraft(context.payload)
    if (
      applicationFormEpoch.value !== context.epoch
      || targetTeacherId.value !== context.teacherId
    ) {
      return
    }
    matchResult.value = result
    applicationId.value = result.id
    void message.success('草稿已保存并重算核验')
    await loadFlowView()
  } catch (error) {
    if (
      applicationFormEpoch.value !== context.epoch
      || targetTeacherId.value !== context.teacherId
    ) {
      return
    }
    if (error instanceof Error && !('response' in error)) {
      showFormValidationMessage(error.message)
      return
    }
    showUserError(error, '保存草稿失败')
  } finally {
    if (applicationFormEpoch.value === context.epoch) {
      draftLoading.value = false
    }
  }
}

const canSubmitApplication = computed(() => {
  if (submitLoading.value || draftLoading.value || matchLoading.value) {
    return false
  }
  if (!selectedTaskId.value) {
    return false
  }
  if (!applicationEditable.value) {
    return false
  }
  if (selectedTask.value && selectedTask.value.withinApplyWindow === false) {
    return false
  }
  if (jobRequired.value && !jobCategory.value) {
    return false
  }
  if (commitmentRequired.value && !commitmentConfirmed.value) {
    return false
  }
  if (!selectionConfirmed.value) {
    return false
  }
  if (matchResult.value?.canSubmit === false) {
    return false
  }
  if (matchResult.value?.withinApplyWindow === false) {
    return false
  }
  return true
})

async function submitApplication() {
  if (submitLoading.value || draftLoading.value || matchLoading.value) {
    return
  }
  if (!applicationEditable.value) {
    showFormValidationMessage('申报已进入审核流程，当前不可重复提交')
    return
  }
  if (!canSubmitApplication.value) {
    if (!selectionConfirmed.value) {
      showFormValidationMessage('提交前须确认本包证据已甄选')
      return
    }
    if (commitmentRequired.value && !commitmentConfirmed.value) {
      showFormValidationMessage('提交前须确认申报承诺')
      return
    }
    showFormValidationMessage('当前核验未通过或表单不完整，请补齐后再提交')
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  let payload: ReturnType<typeof buildRequestPayload>
  try {
    payload = buildRequestPayload()
  } catch (error) {
    if (error instanceof Error) {
      showFormValidationMessage(error.message)
    }
    return
  }
  const context = {
    epoch: applicationFormEpoch.value,
    teacherId: targetTeacherId.value,
    payload,
  }
  if (!(await confirmProxyWrite('提交职称申报'))) {
    return
  }
  if (
    applicationFormEpoch.value !== context.epoch
    || targetTeacherId.value !== context.teacherId
  ) {
    showFormValidationMessage('申报范围已切换，请重新提交')
    return
  }
  try {
    submitLoading.value = true
    const draft = await portfolioTitlePromotionApi.saveDraft(context.payload)
    if (
      applicationFormEpoch.value !== context.epoch
      || targetTeacherId.value !== context.teacherId
    ) {
      return
    }
    matchResult.value = draft
    applicationId.value = draft.id
    if (!draft.id) {
      showFormValidationMessage('保存草稿后未返回申报单号，无法提交')
      return
    }
    if (!draft.canSubmit) {
      showFormValidationMessage('当前核验未通过，请按缺口提示补齐后再提交')
      return
    }
    const draftId = draft.id
    matchResult.value = await portfolioTitlePromotionApi.submit({ id: draftId })
    if (
      applicationFormEpoch.value !== context.epoch
      || targetTeacherId.value !== context.teacherId
    ) {
      return
    }
    void message.success('申报已提交')
    await loadFlowView()
  } catch (error) {
    if (
      applicationFormEpoch.value !== context.epoch
      || targetTeacherId.value !== context.teacherId
    ) {
      return
    }
    if (error instanceof Error && !('response' in error)) {
      showFormValidationMessage(error.message)
      return
    }
    showUserError(error, '提交申报失败')
  } finally {
    if (applicationFormEpoch.value === context.epoch) {
      submitLoading.value = false
    }
  }
}

watch(selectedTaskId, async () => {
  if (suppressTaskWatch.value) {
    return
  }
  bumpApplicationFormEpoch()
  evidenceByCriteria.value = {}
  manualNoteByCriteria.value = {}
  evidenceOptionsByCriteria.value = {}
  matchResult.value = null
  applicationId.value = undefined
  flowView.value = null
  selectionConfirmed.value = false
  commitmentConfirmed.value = false
  if (jobOptions.value.length === 1) {
    jobCategory.value = jobOptions.value[0].value
  } else {
    jobCategory.value = undefined
  }
  await loadExistingApplication()
  await refreshEvidenceForVisibleCriteria()
})

watch(
  () => [
    targetTeacherId.value,
    readRouteStringParam(route.query.applicationId),
    readRouteStringParam(route.query.taskId),
  ],
  async () => {
    bumpApplicationFormEpoch()
    const deepTaskId = readRouteStringParam(route.query.taskId)
    if (
      deepTaskId
      && publishedTasks.value.some((item) => item.id === deepTaskId)
      && selectedTaskId.value !== deepTaskId
    ) {
      suppressTaskWatch.value = true
      selectedTaskId.value = deepTaskId
      suppressTaskWatch.value = false
    }
    await loadExistingApplication()
    await refreshEvidenceForVisibleCriteria()
  },
)

watch([pathCode, jobCategory], async () => {
  matchPreviewToken.value += 1
  const options = jobOptions.value
  if (options.length === 1 && jobCategory.value !== options[0].value) {
    jobCategory.value = options[0].value
  } else if (jobCategory.value && !options.some((option) => option.value === jobCategory.value)) {
    jobCategory.value = undefined
  }
  void loadFlowView()
  await refreshEvidenceForVisibleCriteria()
})

watch(
  [evidenceByCriteria, manualNoteByCriteria, commitmentConfirmed, selectionConfirmed],
  () => {
    matchPreviewToken.value += 1
  },
  { deep: true },
)

usePortfolioScopedLoader(
  async () => {
    loading.value = true
    try {
      await loadPublishedTasks()
      await loadExistingApplication()
      await refreshEvidenceForVisibleCriteria()
    } finally {
      loading.value = false
    }
  },
  () => targetTeacherId.value,
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="职称申报"
        :subtitle="selectedTask ? selectedTask.taskName : undefined"
      />
    </template>
    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
      class="dp-mb-component"
    />
    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <template v-else>
      <p class="promotion-scene__select-hint">
        出包前请甄选证据：完整度不等于代表作质量；优先绑定能支撑条件的关键材料，避免堆砌。
        <button type="button" class="promotion-scene__select-link" @click="goMasterpiecePreview">
          预览代表作
        </button>
      </p>

      <div class="promotion-scene__grid promotion-scene__grid--2col">
        <UiCard title="申报配置">
          <div class="promotion-scene__stack">
            <label class="promotion-scene__label">申报任务</label>
            <UiSelect
              v-model="selectedTaskId"
              size="sm"
              :options="taskOptions"
              :disabled="formWritePending || !applicationEditable"
              placeholder="请选择已发布任务"
            />
            <p
              v-if="selectedTask?.periodStart && selectedTask?.periodEnd"
              class="promotion-scene__window"
            >
              申报受理窗口：{{ selectedTask.periodStart }} ~ {{ selectedTask.periodEnd }}
              <UiTag
                size="sm"
                :tone="selectedTask.withinApplyWindow ? 'green' : 'orange'"
              >
                {{ selectedTask.withinApplyWindow ? '受理中' : '未开放' }}
              </UiTag>
            </p>
            <UiAlertStrip
              v-if="selectedTask && selectedTask.withinApplyWindow === false"
              tone="warning"
              size="sm"
              dense
              inline
              :show-icon="false"
            >
              当前不在申报受理时间窗内，无法保存草稿或提交；请等待开放或联系人事调整窗口。
            </UiAlertStrip>
            <label class="promotion-scene__label">申报路径</label>
            <UiRadioGroup
              v-model="pathCode"
              size="sm"
              :disabled="formWritePending || !applicationEditable"
              :options="pathCodeOptions"
            />
            <template v-if="jobRequired">
              <label class="promotion-scene__label">岗位类型</label>
              <UiSelect
                v-model="jobCategory"
                size="sm"
                :options="jobOptions"
                :disabled="formWritePending || !applicationEditable"
                placeholder="请选择岗位类型"
              />
            </template>
            <UiCheckbox
              v-if="commitmentRequired"
              v-model="commitmentConfirmed"
              :disabled="formWritePending || !applicationEditable"
            >
              本人确认申报材料真实完整，对材料真实性负责
            </UiCheckbox>
            <UiCheckbox
              v-model="selectionConfirmed"
              :disabled="formWritePending || !applicationEditable"
            >
              本包证据已甄选：完整度不等于代表作质量，仅绑定支撑条件的关键材料
            </UiCheckbox>
            <UiAlertStrip
              v-if="!applicationEditable"
              tone="info"
              size="sm"
              dense
              inline
              :show-icon="false"
            >
              申报已进入审核流程，当前展示提交时的核验与证据快照。退回补正后可继续编辑。
            </UiAlertStrip>
            <div v-else class="promotion-scene__actions">
              <UiButton
                size="sm"
                variant="outline"
                :loading="matchLoading"
                :disabled="selectedTask?.withinApplyWindow === false"
                @click="previewMatch"
              >
                预览核验
              </UiButton>
              <UiButton
                size="sm"
                variant="ghost"
                :loading="draftLoading"
                :disabled="selectedTask?.withinApplyWindow === false"
                @click="saveDraft"
              >
                保存草稿
              </UiButton>
              <UiButton
                size="sm"
                variant="primary"
                :loading="submitLoading"
                :disabled="!canSubmitApplication"
                @click="submitApplication"
              >
                提交申报
              </UiButton>
            </div>
          </div>
        </UiCard>

        <TitlePromotionFlowPanel :flow="flowView" :loading="flowLoading" />
      </div>

      <div class="promotion-scene__grid promotion-scene__grid--2col promotion-scene__grid--spaced">
        <UiCard title="核验结果">
          <template v-if="matchResult">
            <div class="promotion-scene__tag-row">
              <UiTag v-if="applicationEditable" :tone="matchResult.canSubmit ? 'green' : 'red'">
                {{ matchResult.canSubmit ? '可提交' : '不可提交' }}
              </UiTag>
              <UiTag v-else tone="blue">
                {{
                  strictEnumLabel(
                    PortfolioTitlePromotionApplicationStatusDescription,
                    matchResult.applicationStatus,
                    '申报状态',
                  )
                }}
              </UiTag>
              <UiTag :tone="matchResult.redlineBlocked ? 'red' : 'green'">
                {{ matchResult.redlineBlocked ? '红线阻断' : '红线通过' }}
              </UiTag>
              <UiTag :tone="matchResult.hardPass ? 'green' : 'red'">
                {{ matchResult.hardPass ? '硬门槛通过' : '硬门槛未通过' }}
              </UiTag>
              <UiTag :tone="matchResult.performancePass ? 'green' : 'orange'">
                {{ matchResult.performancePass ? '业绩规则通过' : '业绩规则未全部满足' }}
              </UiTag>
              <span class="promotion-scene__metric">匹配分 {{ matchResult.matchScore || '-' }}</span>
              <span class="promotion-scene__metric">材料 {{ matchResult.materialRate || '-' }}</span>
              <span class="promotion-scene__metric">业绩 {{ matchResult.performanceRate || '-' }}</span>
              <span class="promotion-scene__metric">硬门槛 {{ matchResult.hardRate || '-' }}</span>
              <UiTag
                v-if="matchResult.lifecycleStatus"
                size="sm"
                :tone="
                  portfolioLifecycleTagTone(matchResult.lifecycleStatus)
                "
              >
                {{ portfolioLifecycleStatusDisplay(matchResult.lifecycleStatus) }}
              </UiTag>
              <UiTag v-if="matchResult.evaluationHeld" size="sm" tone="orange">参评 hold</UiTag>
              <UiTag v-if="matchResult.archiveWriteForbidden" size="sm" tone="red">写禁</UiTag>
              <PortfolioOwnerIdentityLayersCell
                v-if="matchResult.ownerIdentityLayers?.length"
                :layers="matchResult.ownerIdentityLayers"
                :note="matchResult.ownerMultiIdentityNote"
                :row-key="matchResult.id || matchResult.teacherUserId"
                show-note
              />
            </div>
            <div class="promotion-scene__stack">
              <div
                v-for="item in matchResult.criteriaResults || []"
                :key="item.taskCriteriaId"
                class="promotion-scene__panel"
              >
                <div class="promotion-scene__panel-head">
                  <strong>{{ item.criteriaTitle }}</strong>
                  <UiTag>
                    {{
                      strictEnumLabel(
                        PortfolioTitleCriteriaGateKindDescription,
                        item.gateKind,
                        '门槛类型',
                      )
                    }}
                  </UiTag>
                  <UiTag :tone="item.satisfied ? 'green' : 'red'">
                    {{ item.satisfied ? '满足' : '未满足' }}
                  </UiTag>
                  <UiTag v-if="item.blockOnFail && !item.satisfied" tone="red"> 阻断提交 </UiTag>
                </div>
                <div class="dp-meta">
                  {{
                    strictEnumLabel(
                      PortfolioTitleCriteriaCheckTypeDescription,
                      item.checkType,
                      '核验类型',
                    )
                  }}
                  <span v-if="item.groupCode"> · 组 {{ item.groupCode }} </span>
                  <span
                    v-if="item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP"
                  >
                    · 任选其一
                  </span>
                  <span
                    v-if="
                      item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP
                    "
                  >
                    · 至少 {{ item.groupMinimumCount || 'N' }} 项
                  </span>
                </div>
                <div v-if="item.criteriaDescription" class="promotion-scene__panel-desc">
                  {{ item.criteriaDescription }}
                </div>
                <div class="promotion-scene__panel-body">
                  {{ item.evidenceSummary }}
                </div>
                <div v-if="item.gapHint" class="promotion-scene__panel-gap">
                  {{ item.gapHint }}
                </div>
              </div>
            </div>
          </template>
          <UiAlertStrip
            v-else
            tone="info"
            size="sm"
            dense
            inline
            :show-icon="false"
            class="promotion-scene__gate"
          >
            <template #default>
              <span class="promotion-scene__gate-row">
                <UiTag tone="blue" size="sm">待预览核验</UiTag>
                <span>完成证据绑定后点击「预览核验」</span>
              </span>
            </template>
          </UiAlertStrip>
        </UiCard>
      </div>

      <UiCard
        v-if="applicationEditable"
        class="promotion-scene__evidence-card"
        title="条件与证据绑定"
      >
        <div v-if="taskCriteria.length" class="promotion-scene__stack">
          <div v-for="criteria in taskCriteria" :key="criteria.id" class="promotion-scene__panel">
            <div class="promotion-scene__panel-head promotion-scene__panel-head--spaced">
              <strong>{{ criteria.criteriaTitle }}</strong>
              <UiTag>
                {{
                  strictEnumLabel(
                    PortfolioTitleCriteriaGateKindDescription,
                    criteria.gateKind,
                    '门槛类型',
                  )
                }}
              </UiTag>
              <span class="dp-meta">
                {{
                  strictEnumLabel(
                    PortfolioTitleCriteriaCheckTypeDescription,
                    criteria.checkType,
                    '核验类型',
                  )
                }}
              </span>
              <UiTag v-if="criteria.autoEvaluable" tone="blue"> 系统自动核验 </UiTag>
            </div>
            <div v-if="formatGroupHint(criteria)" class="dp-meta promotion-scene__group-hint">
              {{ formatGroupHint(criteria) }}
            </div>
            <div v-if="criteria.criteriaDescription" class="promotion-scene__panel-desc">
              {{ criteria.criteriaDescription }}
            </div>
            <UiSelect
              v-if="isEvidenceSelectable(criteria)"
              v-model="evidenceByCriteria[criteria.id]"
              mode="multiple"
              size="sm"
              allow-clear
              allow-search
              :filter-option="false"
              placeholder="搜索学年/分类名选择正式档案"
              :options="evidenceOptionsForCriteria(criteria)"
              :loading="loading || isEvidenceLoading(criteria.id)"
              :disabled="formWritePending || !applicationEditable"
              @search="(keyword: string) => handleEvidenceSearch(criteria.id, keyword)"
            />
            <UiTextarea
              v-else-if="isManualCheck(criteria)"
              v-model="manualNoteByCriteria[criteria.id]"
              size="sm"
              :rows="3"
              placeholder="填写人工确认说明（必填）"
              :disabled="formWritePending || !applicationEditable"
            />
            <div v-else class="promotion-scene__panel-desc">
              无需绑定档案，预览时将按系统事实自动核验
            </div>
          </div>
        </div>
        <WorkbenchContextGateStrip
          v-else
          tag="未选择任务"
          body="请先在左侧选择已发布的职称申报任务后再绑定证据"
          hide-cta
        />
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.promotion-scene__select-hint {
  margin: 0 0 var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface-subtle);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
  line-height: 1.45;
}
.promotion-scene__select-link {
  margin-left: var(--dp-space-component-tight);
  border: none;
  background: transparent;
  color: var(--dp-color-primary);
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.promotion-scene__grid {
  display: grid;
  gap: var(--dp-space-block);
}

.promotion-scene__grid--2col {
  grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
  .promotion-scene__grid--2col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.promotion-scene__grid--spaced {
  margin-top: var(--dp-space-block);
}

.promotion-scene__stack {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.promotion-scene__label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.promotion-scene__window {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.promotion-scene__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}

.promotion-scene__tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
}

.promotion-scene__metric {
  color: var(--dp-text-secondary);
}

.promotion-scene__panel {
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control);
}

.promotion-scene__panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component-xs);
}

.promotion-scene__panel-head--spaced {
  margin-bottom: var(--dp-space-component-tight);
}

.promotion-scene__panel-desc,
.promotion-scene__panel-body {
  margin-top: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.promotion-scene__panel-gap {
  margin-top: var(--dp-space-component-xs);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-danger);
}

.promotion-scene__group-hint {
  margin-bottom: var(--dp-space-component-tight);
}

.promotion-scene__evidence-card {
  margin-top: var(--dp-space-block);
}

.promotion-scene__gate-row {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
}
</style>
