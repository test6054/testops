<script setup lang="ts">
import type {
  PortfolioTitleEvidenceItem,
  PortfolioTitlePromotionApplicationVO,
  PortfolioTitlePromotionFlowViewVO,
  PortfolioTitlePromotionTaskVO,
  PortfolioTitleTaskCriteriaVO,
} from '@/apis/portfolio/title-promotion'
import type { PortfolioArchiveCategoryTreeNodeVO, PortfolioArchiveRecordSummaryVO } from '@/apis/portfolio/types'
import type { PortfolioTitleJobCategoryCode } from '@/types/enums/portfolio-title-job-category-enum'
import { Checkbox, message, Radio, Select } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { PortfolioArchiveRecordStatusCode } from '@/apis/portfolio/enums'
import { portfolioTitlePromotionApi } from '@/apis/portfolio/title-promotion'
import TitlePromotionFlowPanel from '@/components/portfolio/TitlePromotionFlowPanel.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { PortfolioArchiveCategoryStatusCode } from '@/types/enums/portfolio-archive-category-status-enum'
import {
  PortfolioTitleCriteriaCheckTypeCode,
  PortfolioTitleCriteriaCheckTypeDescription,
} from '@/types/enums/portfolio-title-criteria-check-type-enum'
import { PortfolioTitleCriteriaGateKindDescription } from '@/types/enums/portfolio-title-criteria-gate-kind-enum'
import { PortfolioTitleCriteriaPathCode } from '@/types/enums/portfolio-title-criteria-path-code-enum'
import {
  PortfolioTitleCriteriaSatisfyModeCode,
} from '@/types/enums/portfolio-title-criteria-satisfy-mode-enum'
import { PortfolioTitleEvidenceTypeCode } from '@/types/enums/portfolio-title-evidence-type-enum'
import { PortfolioTitleJobCategoryDescription } from '@/types/enums/portfolio-title-job-category-enum'
import { PortfolioTitlePromotionTaskStatusCode } from '@/types/enums/portfolio-title-promotion-task-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const loading = ref(false)
const matchLoading = ref(false)
const draftLoading = ref(false)
const submitLoading = ref(false)
const records = ref<PortfolioArchiveRecordSummaryVO[]>([])
const categoryCodeById = ref<Record<string, string>>({})
const publishedTasks = ref<PortfolioTitlePromotionTaskVO[]>([])
const selectedTaskId = ref<string | undefined>()
const pathCode = ref(PortfolioTitleCriteriaPathCode.NORMAL)
const jobCategory = ref<PortfolioTitleJobCategoryCode | undefined>()
const commitmentConfirmed = ref(false)
const evidenceByCriteria = ref<Record<string, string[]>>({})
const manualNoteByCriteria = ref<Record<string, string>>({})
const matchResult = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const applicationId = ref<string | undefined>()
const flowView = ref<PortfolioTitlePromotionFlowViewVO | null>(null)
const flowLoading = ref(false)
const taskRequestToken = ref(0)
const recordRequestToken = ref(0)
const applicationRequestToken = ref(0)
const flowRequestToken = ref(0)

const selectedTask = computed(() =>
  publishedTasks.value.find(item => item.id === selectedTaskId.value),
)
const taskCriteria = computed<PortfolioTitleTaskCriteriaVO[]>(() => {
  const list = selectedTask.value?.taskCriteria || []
  return list.filter((item) => {
    const pathOk = item.pathCode === PortfolioTitleCriteriaPathCode.COMMON
      || item.pathCode === pathCode.value
    const jobOk = !item.jobCategory || item.jobCategory === jobCategory.value
    return pathOk && jobOk
  })
})
const jobOptions = computed(() => {
  const set = new Set<PortfolioTitleJobCategoryCode>()
  for (const item of selectedTask.value?.taskCriteria || []) {
    if (item.jobCategory) {
      set.add(item.jobCategory as PortfolioTitleJobCategoryCode)
    }
  }
  return [...set].map(value => ({
    value,
    label: strictEnumLabel(PortfolioTitleJobCategoryDescription, value, '岗位类型'),
  }))
})
const jobRequired = computed(() => jobOptions.value.length > 0)
const commitmentRequired = computed(() => taskCriteria.value.some(
  item => item.checkType === PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED,
))
const taskOptions = computed(() =>
  publishedTasks.value.map(task => ({
    value: task.id,
    label: `${task.taskName}（${task.targetTitleLevel} · ${task.reviewYear}）`,
  })),
)
function recordOptionsForCriteria(criteria: PortfolioTitleTaskCriteriaVO) {
  return records.value
    .filter(item => !criteria.evidenceCategoryCode
      || categoryCodeById.value[item.categoryId] === criteria.evidenceCategoryCode)
    .map(item => ({
      value: item.id,
      label: (item.categoryName || '正式档案') + '（' + item.id + '）',
    }))
}

function formatGroupHint(criteria: PortfolioTitleTaskCriteriaVO): string | undefined {
  if (!criteria.groupCode) {
    return undefined
  }
  if (criteria.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP) {
    return `组「${criteria.groupCode}」：任选其一`
  }
  if (criteria.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP) {
    return '组「' + criteria.groupCode + '」：至少满足 '
      + (criteria.groupMinimumCount || 'N') + ' 项'
  }
  return undefined
}

function isEvidenceSelectable(criteria: PortfolioTitleTaskCriteriaVO): boolean {
  return !criteria.autoEvaluable
    && criteria.checkType !== PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED
    && criteria.checkType !== PortfolioTitleCriteriaCheckTypeCode.MANUAL_CHECK
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
      item => item.checkType === PortfolioTitleCriteriaCheckTypeCode.COMMITMENT_CONFIRMED,
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
  if (app.pathCode === PortfolioTitleCriteriaPathCode.EXCEPTION
    || app.pathCode === PortfolioTitleCriteriaPathCode.NORMAL) {
    pathCode.value = app.pathCode
  }
  jobCategory.value = app.jobCategory
  commitmentConfirmed.value = Boolean(app.commitmentConfirmed)
  const nextEvidence: Record<string, string[]> = {}
  const nextNotes: Record<string, string> = {}
  for (const item of app.evidenceItems || []) {
    if (item.evidenceType === PortfolioTitleEvidenceTypeCode.MANUAL_NOTE) {
      nextNotes[item.taskCriteriaId] = item.evidenceNote || ''
      continue
    }
    if (item.evidenceType === PortfolioTitleEvidenceTypeCode.OFFICIAL_RECORD && item.evidenceRefId) {
      const list = nextEvidence[item.taskCriteriaId] || []
      list.push(item.evidenceRefId)
      nextEvidence[item.taskCriteriaId] = list
    }
  }
  evidenceByCriteria.value = nextEvidence
  manualNoteByCriteria.value = nextNotes
  matchResult.value = app
}

async function loadExistingApplication() {
  if (!selectedTaskId.value || !targetTeacherId.value) {
    applicationId.value = undefined
    matchResult.value = null
    evidenceByCriteria.value = {}
    manualNoteByCriteria.value = {}
    return
  }
  const currentToken = ++applicationRequestToken.value
  try {
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
  }
  catch (error) {
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
  }
  catch (error) {
    if (flowRequestToken.value !== currentToken) {
      return
    }
    flowView.value = null
    showUserError(error, '加载评审流程失败')
  }
  finally {
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
    evidenceItems: buildEvidenceItems(),
  }
}

async function loadPublishedTasks() {
  const currentToken = ++taskRequestToken.value
  try {
    const page = await portfolioTitlePromotionApi.pageTask({
      pageNum: 1,
      pageSize: 100,
      taskStatus: PortfolioTitlePromotionTaskStatusCode.PUBLISHED,
    })
    if (taskRequestToken.value !== currentToken) {
      return
    }
    publishedTasks.value = page.list || []
    if (!selectedTaskId.value && publishedTasks.value.length > 0) {
      selectedTaskId.value = publishedTasks.value[0].id
    }
  }
  catch (error) {
    showUserError(error, '加载申报任务失败')
  }
}

async function loadRecords() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    records.value = []
    return
  }
  const currentToken = ++recordRequestToken.value
  loading.value = true
  try {
    const page = await portfolioArchiveApi.pageRecords({
      pageNum: 1,
      pageSize: 200,
      teacherId: targetTeacherId.value,
      recordStatus: PortfolioArchiveRecordStatusCode.OFFICIAL,
    })
    if (recordRequestToken.value !== currentToken) {
      return
    }
    records.value = page.list || []
  }
  catch (error) {
    showUserError(error, '加载正式档案失败')
  }
  finally {
    loading.value = false
  }
}

async function loadArchiveCategories() {
  const tree = await portfolioArchiveTemplateApi.listCategoryTree()
  const next: Record<string, string> = {}
  const visit = (nodes: PortfolioArchiveCategoryTreeNodeVO[]) => {
    for (const node of nodes) {
      if (node.status === PortfolioArchiveCategoryStatusCode.ACTIVE) {
        next[node.id] = node.categoryCode
      }
      visit(node.children || [])
    }
  }
  visit(tree || [])
  categoryCodeById.value = next
}

async function previewMatch() {
  try {
    matchLoading.value = true
    matchResult.value = await portfolioTitlePromotionApi.previewMatch(buildRequestPayload())
  }
  catch (error) {
    if (error instanceof Error && !('response' in error)) {
      showFormValidationMessage(error.message)
      return
    }
    showUserError(error, '预览核验失败')
  }
  finally {
    matchLoading.value = false
  }
}

async function saveDraft() {
  try {
    draftLoading.value = true
    const result = await portfolioTitlePromotionApi.saveDraft(buildRequestPayload())
    matchResult.value = result
    applicationId.value = result.id
    message.success('草稿已保存并重算核验')
    await loadFlowView()
  }
  catch (error) {
    if (error instanceof Error && !('response' in error)) {
      showFormValidationMessage(error.message)
      return
    }
    showUserError(error, '保存草稿失败')
  }
  finally {
    draftLoading.value = false
  }
}

async function submitApplication() {
  try {
    submitLoading.value = true
    const draft = await portfolioTitlePromotionApi.saveDraft(buildRequestPayload())
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
    matchResult.value = await portfolioTitlePromotionApi.submit({ id: draft.id })
    message.success('申报已提交')
    await loadFlowView()
  }
  catch (error) {
    if (error instanceof Error && !('response' in error)) {
      showFormValidationMessage(error.message)
      return
    }
    showUserError(error, '提交申报失败')
  }
  finally {
    submitLoading.value = false
  }
}

watch(selectedTaskId, async () => {
  evidenceByCriteria.value = {}
  manualNoteByCriteria.value = {}
  matchResult.value = null
  applicationId.value = undefined
  flowView.value = null
  if (jobOptions.value.length === 1) {
    jobCategory.value = jobOptions.value[0].value
  }
  else {
    jobCategory.value = undefined
  }
  await loadExistingApplication()
})

watch([pathCode, jobCategory], () => {
  void loadFlowView()
})

usePortfolioScopedLoader(async () => {
  await Promise.all([loadPublishedTasks(), loadRecords(), loadArchiveCategories()])
  await loadExistingApplication()
}, () => targetTeacherId.value)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="职称申报" description="选择路径与岗位，按条件绑定证据并预览资格核验" />

    <div class="grid gap-4 lg:grid-cols-2">
      <UiCard title="申报配置">
        <div class="flex flex-col gap-3">
          <label class="text-sm text-[var(--dp-text-secondary)]">申报任务</label>
          <Select
            v-model:value="selectedTaskId"
            :options="taskOptions"
            placeholder="请选择已发布任务"
            class="w-full"
          />
          <label class="text-sm text-[var(--dp-text-secondary)]">申报路径</label>
          <Radio.Group v-model:value="pathCode">
            <Radio :value="PortfolioTitleCriteriaPathCode.NORMAL">
              正常路径
            </Radio>
            <Radio :value="PortfolioTitleCriteriaPathCode.EXCEPTION">
              破格路径
            </Radio>
          </Radio.Group>
          <template v-if="jobRequired">
            <label class="text-sm text-[var(--dp-text-secondary)]">岗位类型</label>
            <Select
              v-model:value="jobCategory"
              :options="jobOptions"
              placeholder="请选择岗位类型"
              class="w-full"
            />
          </template>
          <Checkbox v-if="commitmentRequired" v-model:checked="commitmentConfirmed">
            本人确认申报材料真实完整，对材料真实性负责
          </Checkbox>
          <div class="flex flex-wrap gap-2">
            <UiButton variant="primary" :loading="matchLoading" @click="previewMatch">
              预览核验
            </UiButton>
            <UiButton :loading="draftLoading" @click="saveDraft">
              保存草稿
            </UiButton>
            <UiButton variant="primary" :loading="submitLoading" @click="submitApplication">
              提交申报
            </UiButton>
          </div>
        </div>
      </UiCard>

      <TitlePromotionFlowPanel :flow="flowView" :loading="flowLoading" />
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <UiCard title="核验结果">
        <template v-if="matchResult">
          <div class="mb-3 flex flex-wrap gap-2 text-sm">
            <UiTag :tone="matchResult.canSubmit ? 'green' : 'red'">
              {{ matchResult.canSubmit ? '可提交' : '不可提交' }}
            </UiTag>
            <UiTag :tone="matchResult.redlineBlocked ? 'red' : 'green'">
              {{ matchResult.redlineBlocked ? '红线阻断' : '红线通过' }}
            </UiTag>
            <span>匹配分 {{ matchResult.matchScore || '-' }}</span>
            <span>材料 {{ matchResult.materialRate || '-' }}</span>
            <span>业绩 {{ matchResult.performanceRate || '-' }}</span>
            <span>硬门槛 {{ matchResult.hardRate || '-' }}</span>
          </div>
          <div class="flex flex-col gap-2">
            <div
              v-for="item in matchResult.criteriaResults || []"
              :key="item.taskCriteriaId"
              class="rounded border border-[var(--dp-border)] p-3"
            >
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <strong>{{ item.criteriaTitle }}</strong>
                <UiTag>
                  {{ strictEnumLabel(PortfolioTitleCriteriaGateKindDescription, item.gateKind, '门槛类型') }}
                </UiTag>
                <UiTag :tone="item.satisfied ? 'green' : 'red'">
                  {{ item.satisfied ? '满足' : '未满足' }}
                </UiTag>
                <UiTag v-if="item.blockOnFail && !item.satisfied" tone="red">
                  阻断提交
                </UiTag>
              </div>
              <div class="text-xs text-[var(--dp-text-secondary)]">
                {{ strictEnumLabel(PortfolioTitleCriteriaCheckTypeDescription, item.checkType, '核验类型') }}
                <span v-if="item.groupCode">
                  · 组 {{ item.groupCode }}
                </span>
                <span v-if="item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.ANY_OF_GROUP">
                  · 任选其一
                </span>
                <span v-if="item.satisfyMode === PortfolioTitleCriteriaSatisfyModeCode.MIN_COUNT_IN_GROUP">
                  · 至少 {{ item.groupMinimumCount || 'N' }} 项
                </span>
              </div>
              <div v-if="item.criteriaDescription" class="mt-1 text-sm">
                {{ item.criteriaDescription }}
              </div>
              <div class="mt-1 text-sm">
                {{ item.evidenceSummary }}
              </div>
              <div v-if="item.gapHint" class="mt-1 text-sm text-[var(--dp-danger)]">
                {{ item.gapHint }}
              </div>
            </div>
          </div>
        </template>
        <UiEmpty v-else description="完成证据绑定后点击「预览核验」" />
      </UiCard>
    </div>

    <UiCard class="mt-4" title="条件与证据绑定">
      <div v-if="taskCriteria.length" class="flex flex-col gap-3">
        <div
          v-for="criteria in taskCriteria"
          :key="criteria.id"
          class="rounded border border-[var(--dp-border)] p-3"
        >
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <strong>{{ criteria.criteriaTitle }}</strong>
            <UiTag>
              {{ strictEnumLabel(PortfolioTitleCriteriaGateKindDescription, criteria.gateKind, '门槛类型') }}
            </UiTag>
            <span class="text-xs text-[var(--dp-text-secondary)]">
              {{ strictEnumLabel(PortfolioTitleCriteriaCheckTypeDescription, criteria.checkType, '核验类型') }}
            </span>
            <UiTag v-if="criteria.autoEvaluable" tone="blue">
              系统自动核验
            </UiTag>
          </div>
          <div v-if="formatGroupHint(criteria)" class="mb-2 text-xs text-[var(--dp-text-secondary)]">
            {{ formatGroupHint(criteria) }}
          </div>
          <div v-if="criteria.criteriaDescription" class="mb-2 text-sm text-[var(--dp-text-secondary)]">
            {{ criteria.criteriaDescription }}
          </div>
          <Select
            v-if="isEvidenceSelectable(criteria)"
            v-model:value="evidenceByCriteria[criteria.id]"
            mode="multiple"
            allow-clear
            class="w-full"
            placeholder="选择正式档案作为证据"
            :options="recordOptionsForCriteria(criteria)"
            :loading="loading"
          />
          <textarea
            v-else-if="isManualCheck(criteria)"
            v-model="manualNoteByCriteria[criteria.id]"
            class="w-full rounded border border-[var(--dp-border)] p-2 text-sm"
            rows="3"
            placeholder="填写人工确认说明（必填）"
          />
          <div v-else class="text-sm text-[var(--dp-text-secondary)]">
            无需绑定档案，预览时将按系统事实自动核验
          </div>
        </div>
      </div>
      <UiEmpty v-else description="请先选择申报任务" />
    </UiCard>
  </StageWorkbenchShell>
</template>
