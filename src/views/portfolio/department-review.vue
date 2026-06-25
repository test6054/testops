<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioAiAnalysisDetailVO,
  PortfolioReviewArchiveRecordDetailVO,
  PortfolioReviewLogVO,
  PortfolioReviewTaskPageRequest,
  PortfolioReviewTaskSummaryVO,
} from '@/apis/portfolio/types'
import type { FilterField } from '@/components/ui-guide/ui/types'
import { DatePicker, Input, message } from 'ant-design-vue'
import type { Dayjs } from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioReviewApi } from '@/apis/portfolio/review'
import {
  PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_LABEL,
  PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL,
  PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
  PORTFOLIO_REVIEW_ACTION_TYPE_LABEL,
  PORTFOLIO_REVIEW_TASK_STATUS_LABEL,
  PORTFOLIO_REVIEW_TASK_STATUS_TONE,
  PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE,
  PORTFOLIO_MATERIAL_RISK_LEVEL_LABEL,
  PORTFOLIO_MATERIAL_RISK_LEVEL_TONE,
  PORTFOLIO_SCHOOL_REVIEW_FLOW_CODE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import { ResultCode } from '@/types/enums/result-code'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

interface ReviewFilterModel {
  departmentId?: string
  categoryId?: string
  teacherId?: string
  auditFlowCode?: string
  reviewStatus?: PortfolioReviewTaskPageRequest['reviewStatus']
}

const listColumns: ColumnsType = [
  { title: '教师', key: 'teacher', width: 140 },
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 120 },
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '材料分类', dataIndex: 'categoryName', key: 'categoryName', width: 140 },
  { title: '风险', key: 'riskLevel', width: 88 },
  { title: '引用任务', key: 'referenceTask', width: 120 },
  { title: 'AI 初审', key: 'aiPreReview', width: 160 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '档案状态', key: 'recordStatus', width: 100 },
  { title: '审核状态', key: 'reviewStatus', width: 100 },
  { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const fieldColumns: ColumnsType = [
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 140 },
  { title: '值', dataIndex: 'fieldValue', key: 'fieldValue' },
  { title: '证据', dataIndex: 'evidenceRef', key: 'evidenceRef', width: 120 },
]

const logColumns: ColumnsType = [
  { title: '操作', key: 'actionType', width: 100 },
  { title: '意见', dataIndex: 'opinion', key: 'opinion' },
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
]

const { loadTree, departmentOptions } = usePortfolioOrgTree()

const filterForm = reactive<ReviewFilterModel>({
  departmentId: undefined,
  categoryId: undefined,
})

const lowRiskRows = computed(() => rows.value.filter(item => item.riskLevel !== 'SENSITIVE'))
const sensitiveRows = computed(() => rows.value.filter(item => item.riskLevel === 'SENSITIVE'))
const showReviewActions = computed(() =>
  Boolean(activeRow.value?.reviewActionAllowed))

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const categoryOptions = ref<{ label: string, value: string }[]>([])

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'departmentId',
    type: 'select',
    label: '院系',
    allowClear: true,
    width: 200,
    options: departmentOptions(),
  },
  {
    key: 'categoryId',
    type: 'select',
    label: '材料分类',
    allowClear: true,
    width: 200,
    options: categoryOptions.value,
  },
  {
    key: 'teacherId',
    type: 'input',
    label: '教师 ID',
    allowClear: true,
    width: 160,
    placeholder: '用户 ID',
  },
  {
    key: 'auditFlowCode',
    type: 'select',
    label: '审核流',
    allowClear: true,
    width: 180,
    options: [
      { value: PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE, label: '默认审核流' },
      { value: PORTFOLIO_SCHOOL_REVIEW_FLOW_CODE, label: '学校复审（敏感）' },
    ],
  },
  {
    key: 'reviewStatus',
    type: 'select',
    label: '审核状态',
    allowClear: true,
    width: 140,
    options: (Object.keys(PORTFOLIO_REVIEW_TASK_STATUS_LABEL) as PortfolioReviewTaskPageRequest['reviewStatus'][]).map(
      value => ({ value, label: strictEnumLabel(PORTFOLIO_REVIEW_TASK_STATUS_LABEL, value) }),
    ),
  },
])

const loading = ref(false)
const rows = ref<PortfolioReviewTaskSummaryVO[]>([])
const pageNum = ref(1)
const pageTotal = ref(0)
const selectedRowKeys = ref<string[]>([])
const batchSubmitting = ref(false)
const batchRejectSubmitting = ref(false)

const drawerOpen = ref(false)
const activeRow = ref<PortfolioReviewTaskSummaryVO | null>(null)
const recordDetail = ref<PortfolioReviewArchiveRecordDetailVO | null>(null)
const aiPreReview = ref<PortfolioAiAnalysisDetailVO | null>(null)
const aiPreReviewAbsent = ref(false)
const logRows = ref<PortfolioReviewLogVO[]>([])
const detailLoading = ref(false)
const actionSubmitting = ref(false)
const approveOpinion = ref('')
const rejectReason = ref('')
const dismissReason = ref('')
const returnDeadline = ref<Dayjs | null>(null)
const batchRejectReason = ref('')
const batchReturnDeadline = ref<Dayjs | null>(null)
const escalateReason = ref('')

const batchSelectableKeys = computed(() =>
  rows.value.filter(item => item.batchApproveAllowed).map(item => item.id))

async function loadCategories() {
  try {
    const tree = await portfolioArchiveTemplateApi.listCategoryTree()
    categoryOptions.value = flattenCategoryTree(tree ?? [])
  }
  catch (error) {
    showUserError(error, '加载档案分类失败')
  }
}

function flattenCategoryTree(nodes: PortfolioArchiveCategoryTreeNodeVO[]): { label: string, value: string }[] {
  const options: { label: string, value: string }[] = []
  for (const node of nodes) {
    options.push({ label: node.categoryName, value: node.id })
    if (node.children?.length) {
      options.push(...flattenCategoryTree(node.children))
    }
  }
  return options
}

async function loadPage() {
  loading.value = true
  try {
    const result = await portfolioReviewApi.pageTasks({
      pageNum: pageNum.value,
      pageSize: 20,
      departmentId: filterForm.departmentId,
      categoryId: filterForm.categoryId,
      teacherId: filterForm.teacherId,
      auditFlowCode: filterForm.auditFlowCode,
      reviewStatus: filterForm.reviewStatus,
    })
    rows.value = readPageList(result, '加载审核待办失败')
    pageTotal.value = readPageTotal(result, '加载审核待办失败')
    selectedRowKeys.value = selectedRowKeys.value.filter(id => batchSelectableKeys.value.includes(id))
  }
  catch (error) {
    showUserError(error, '加载审核待办失败')
  }
  finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  void loadPage()
}

function handlePageChange(next: number) {
  pageNum.value = next
  void loadPage()
}

async function openDetail(row: PortfolioReviewTaskSummaryVO) {
  activeRow.value = row
  drawerOpen.value = true
  approveOpinion.value = ''
  rejectReason.value = ''
  dismissReason.value = ''
  returnDeadline.value = null
  escalateReason.value = ''
  detailLoading.value = true
  recordDetail.value = null
  aiPreReview.value = null
  aiPreReviewAbsent.value = false
  logRows.value = []
  try {
    recordDetail.value = await portfolioReviewApi.getArchiveRecord(row.archiveRecordId)
    if (row.reviewActionAllowed) {
      logRows.value = await portfolioReviewApi.listLogs(row.id)
      try {
        aiPreReview.value = await portfolioReviewApi.getAiPreReview(row.id)
      }
      catch (error) {
        if (readBusinessResultCode(error) === ResultCode.DATA_NOT_FOUND) {
          aiPreReviewAbsent.value = true
        }
        else {
          showUserError(error, '加载 AI 初审失败')
        }
      }
    }
  }
  catch (error) {
    showUserError(error, '加载审核详情失败')
  }
  finally {
    detailLoading.value = false
  }
}

async function handleApprove() {
  if (!activeRow.value) {
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.approve({
      reviewTaskId: activeRow.value.id,
      opinion: approveOpinion.value.trim() || undefined,
    })
    message.success('审核已通过')
    drawerOpen.value = false
    await loadPage()
  }
  catch (error) {
    showUserError(error, '审核通过失败')
  }
  finally {
    actionSubmitting.value = false
  }
}

async function handleReject() {
  if (!activeRow.value || !rejectReason.value.trim() || !returnDeadline.value) {
    message.warning('请填写退回原因与重提期限')
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.reject({
      reviewTaskId: activeRow.value.id,
      reason: rejectReason.value.trim(),
      returnDeadline: returnDeadline.value.format('YYYY-MM-DD HH:mm:ss'),
    })
    message.success('已退回修改')
    drawerOpen.value = false
    await loadPage()
  }
  catch (error) {
    showUserError(error, '审核退回失败')
  }
  finally {
    actionSubmitting.value = false
  }
}

async function handleDismiss() {
  if (!activeRow.value || !dismissReason.value.trim()) {
    message.warning('请填写驳回依据')
    return
  }
  const ok = await confirmAsync('确认驳回该档案材料？驳回后记录将作废。')
  if (!ok) {
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.dismiss({
      reviewTaskId: activeRow.value.id,
      reason: dismissReason.value.trim(),
    })
    message.success('已驳回')
    drawerOpen.value = false
    await loadPage()
  }
  catch (error) {
    showUserError(error, '审核驳回失败')
  }
  finally {
    actionSubmitting.value = false
  }
}

async function handleBatchApprove() {
  if (!selectedRowKeys.value.length) {
    message.warning('请选择可批量通过的待审任务')
    return
  }
  batchSubmitting.value = true
  try {
    const count = await portfolioReviewApi.batchApprove({ reviewTaskIds: selectedRowKeys.value })
    message.success(`已批量通过 ${count} 条`)
    selectedRowKeys.value = []
    await loadPage()
  }
  catch (error) {
    showUserError(error, '批量通过失败')
  }
  finally {
    batchSubmitting.value = false
  }
}

async function handleBatchReject() {
  if (!selectedRowKeys.value.length) {
    message.warning('请选择可批量退回的待审任务')
    return
  }
  if (!batchRejectReason.value.trim() || !batchReturnDeadline.value) {
    message.warning('请填写批量退回原因与重提期限')
    return
  }
  batchRejectSubmitting.value = true
  try {
    const count = await portfolioReviewApi.batchReject({
      reviewTaskIds: selectedRowKeys.value,
      reason: batchRejectReason.value.trim(),
      returnDeadline: batchReturnDeadline.value.format('YYYY-MM-DD HH:mm:ss'),
    })
    message.success(`已批量退回 ${count} 条`)
    selectedRowKeys.value = []
    batchRejectReason.value = ''
    batchReturnDeadline.value = null
    await loadPage()
  }
  catch (error) {
    showUserError(error, '批量退回失败')
  }
  finally {
    batchRejectSubmitting.value = false
  }
}

async function handleEscalate() {
  if (!activeRow.value || !escalateReason.value.trim()) {
    message.warning('请填写转复审原因')
    return
  }
  const ok = await confirmAsync('确认将该材料转学校复审？转复审后禁止批量操作。')
  if (!ok) {
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.escalate({
      reviewTaskId: activeRow.value.id,
      reason: escalateReason.value.trim(),
    })
    message.success('已转复审')
    drawerOpen.value = false
    await loadPage()
  }
  catch (error) {
    showUserError(error, '转复审失败')
  }
  finally {
    actionSubmitting.value = false
  }
}

onMounted(async () => {
  await loadTree()
  await loadCategories()
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell title="院系审核台" subtitle="待审档案材料审核、退回与留痕">
    <UiFilterBar
      v-model="filterModel"
      :fields="filterFields"
      @search="handleSearch"
    />
    <UiCard class="review-card">
      <p v-if="sensitiveRows.length" class="review-sensitive-hint">
        敏感材料须单条复核，禁止批量通过/退回。
      </p>
      <div v-if="lowRiskRows.length" class="review-section">
        <h3 class="review-section__title">
          低风险待办（可批量）
        </h3>
        <div class="review-toolbar">
          <UiButton
            type="primary"
            :loading="batchSubmitting"
            :disabled="!selectedRowKeys.length"
            @click="handleBatchApprove"
          >
            批量通过（{{ selectedRowKeys.length }}）
          </UiButton>
          <UiButton
            :loading="batchRejectSubmitting"
            :disabled="!selectedRowKeys.length"
            @click="handleBatchReject"
          >
            批量退回（{{ selectedRowKeys.length }}）
          </UiButton>
        </div>
        <div v-if="selectedRowKeys.length" class="review-batch-reject">
          <Input v-model:value="batchRejectReason" placeholder="批量退回原因" />
          <DatePicker
            v-model:value="batchReturnDeadline"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="重提期限"
            style="width: 100%"
          />
        </div>
        <UiDataTable
          row-key="id"
          :columns="listColumns"
          :data-source="lowRiskRows"
          :loading="loading"
          :pagination="false"
          :row-selection="{
            selectedRowKeys,
            onChange: (keys: string[]) => { selectedRowKeys = keys },
            getCheckboxProps: (record: PortfolioReviewTaskSummaryVO) => ({
              disabled: !record.batchApproveAllowed,
            }),
          }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'teacher'">
              {{ record.teacherName ?? '—' }}
            </template>
            <template v-else-if="column.key === 'riskLevel'">
              <UiTag
                v-if="record.riskLevel"
                :tone="strictEnumTone(PORTFOLIO_MATERIAL_RISK_LEVEL_TONE, record.riskLevel)"
              >
                {{ strictEnumLabel(PORTFOLIO_MATERIAL_RISK_LEVEL_LABEL, record.riskLevel) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'referenceTask'">
              {{ record.referenceAiTaskId ?? '—' }}
            </template>
            <template v-else-if="column.key === 'aiPreReview'">
              {{ record.aiPreReviewSummary ?? '—' }}
            </template>
            <template v-else-if="column.key === 'sourceType'">
              {{ record.sourceType ? strictEnumLabel(PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_LABEL, record.sourceType) : '—' }}
            </template>
            <template v-else-if="column.key === 'recordStatus'">
              <UiTag
                v-if="record.recordStatus"
                :tone="strictEnumTone(PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE, record.recordStatus)"
              >
                {{ strictEnumLabel(PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL, record.recordStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'reviewStatus'">
              <UiTag :tone="strictEnumTone(PORTFOLIO_REVIEW_TASK_STATUS_TONE, record.reviewStatus)">
                {{ strictEnumLabel(PORTFOLIO_REVIEW_TASK_STATUS_LABEL, record.reviewStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="openDetail(record)">
                复核
              </UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </div>
      <div v-if="sensitiveRows.length" class="review-section">
        <h3 class="review-section__title">
          敏感材料（强制单条）
        </h3>
        <UiDataTable
          row-key="id"
          :columns="listColumns"
          :data-source="sensitiveRows"
          :loading="loading"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'teacher'">
              {{ record.teacherName ?? '—' }}
            </template>
            <template v-else-if="column.key === 'riskLevel'">
              <UiTag
                v-if="record.riskLevel"
                :tone="strictEnumTone(PORTFOLIO_MATERIAL_RISK_LEVEL_TONE, record.riskLevel)"
              >
                {{ strictEnumLabel(PORTFOLIO_MATERIAL_RISK_LEVEL_LABEL, record.riskLevel) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'referenceTask'">
              {{ record.referenceAiTaskId ?? '—' }}
            </template>
            <template v-else-if="column.key === 'aiPreReview'">
              {{ record.aiPreReviewSummary ?? '—' }}
            </template>
            <template v-else-if="column.key === 'sourceType'">
              {{ record.sourceType ? strictEnumLabel(PORTFOLIO_ARCHIVE_RECORD_SOURCE_TYPE_LABEL, record.sourceType) : '—' }}
            </template>
            <template v-else-if="column.key === 'recordStatus'">
              <UiTag
                v-if="record.recordStatus"
                :tone="strictEnumTone(PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE, record.recordStatus)"
              >
                {{ strictEnumLabel(PORTFOLIO_ARCHIVE_RECORD_STATUS_LABEL, record.recordStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'reviewStatus'">
              <UiTag :tone="strictEnumTone(PORTFOLIO_REVIEW_TASK_STATUS_TONE, record.reviewStatus)">
                {{ strictEnumLabel(PORTFOLIO_REVIEW_TASK_STATUS_LABEL, record.reviewStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="openDetail(record)">
                单条复核
              </UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </div>
      <UiEmpty v-if="!loading && !rows.length" description="暂无审核待办" />
      <div v-if="pageTotal > 20" class="review-pagination">
        <UiButton @click="handlePageChange(pageNum - 1)" :disabled="pageNum <= 1">
          上一页
        </UiButton>
        <span>{{ pageNum }} / {{ Math.ceil(pageTotal / 20) }}</span>
        <UiButton @click="handlePageChange(pageNum + 1)" :disabled="pageNum * 20 >= pageTotal">
          下一页
        </UiButton>
      </div>
    </UiCard>

    <UiDrawer
      v-model:open="drawerOpen"
      title="审核复核"
      width="720"
    >
      <template v-if="activeRow">
        <p class="review-meta">
          {{ activeRow.teacherName }} · {{ activeRow.categoryName }} ·
          {{ strictEnumLabel(PORTFOLIO_REVIEW_TASK_STATUS_LABEL, activeRow.reviewStatus) }}
        </p>
        <p v-if="aiPreReview?.summary" class="review-ai-summary">
          AI 初审：{{ aiPreReview.summary }}
        </p>
        <ul v-if="aiPreReview?.issueItems?.length" class="review-ai-issues">
          <li v-for="(issue, index) in aiPreReview.issueItems" :key="index">
            {{ issue.issueTitle }}：{{ issue.issueDescription }}
          </li>
        </ul>
        <p v-else-if="activeRow.aiPreReviewSummary" class="review-ai-summary">
          AI 初审：{{ activeRow.aiPreReviewSummary }}
        </p>
        <p v-else-if="aiPreReviewAbsent && activeRow.reviewActionAllowed" class="review-ai-summary review-ai-absent">
          尚无 AI 初审结果
        </p>
        <p v-if="activeRow.singleReviewRequired" class="review-sensitive-hint">
          敏感材料：须单条复核，禁止批量操作。
        </p>
        <UiDataTable
          v-if="recordDetail?.fields?.length"
          row-key="fieldCode"
          size="small"
          :columns="fieldColumns"
          :data-source="recordDetail.fields"
          :pagination="false"
        />
        <UiEmpty v-else-if="!detailLoading" description="暂无字段快照" />
        <UiDataTable
          v-if="logRows.length"
          class="review-logs"
          row-key="id"
          size="small"
          :columns="logColumns"
          :data-source="logRows"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actionType'">
              {{ strictEnumLabel(PORTFOLIO_REVIEW_ACTION_TYPE_LABEL, record.actionType) }}
            </template>
          </template>
        </UiDataTable>
        <div v-if="showReviewActions" class="review-actions">
          <Input v-model:value="approveOpinion" placeholder="通过意见（可选）" />
          <div class="review-actions__row">
            <UiButton type="primary" :loading="actionSubmitting" @click="handleApprove">
              通过
            </UiButton>
          </div>
          <template v-if="activeRow.escalateAllowed">
            <Input v-model:value="escalateReason" placeholder="转复审原因" />
            <UiButton :loading="actionSubmitting" @click="handleEscalate">
              转复审
            </UiButton>
          </template>
          <Input v-model:value="rejectReason" placeholder="退回原因" />
          <DatePicker
            v-model:value="returnDeadline"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="重提期限"
            style="width: 100%"
          />
          <UiButton :loading="actionSubmitting" @click="handleReject">
            退回修改
          </UiButton>
          <Input v-model:value="dismissReason" placeholder="驳回依据" />
          <UiButton danger :loading="actionSubmitting" @click="handleDismiss">
            驳回
          </UiButton>
        </div>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.review-card {
  margin-top: 16px;
}
.review-batch-reject {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.review-toolbar {
  margin-bottom: 12px;
}
.review-section {
  margin-bottom: 16px;
}
.review-section__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.review-sensitive-hint {
  margin: 0 0 12px;
  color: var(--ant-color-error);
  font-size: 13px;
}
.review-pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.review-meta {
  margin: 0 0 12px;
  color: var(--dp-color-text-secondary);
}
.review-ai-summary {
  margin: 0 0 8px;
  font-size: 13px;
}
.review-ai-issues {
  margin: 0 0 12px 16px;
  padding: 0;
  font-size: 13px;
  color: var(--dp-color-text-secondary);
}
.review-ai-absent {
  color: var(--dp-color-text-secondary);
}
.review-logs {
  margin-top: 16px;
}
.review-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}
.review-actions__row {
  display: flex;
  gap: 8px;
}
</style>
