<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationObjectionSummaryVO } from '@/apis/portfolio/types'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import { Input, InputNumber, message, Select } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  PortfolioEvaluationObjectionHandleActionCode,
  PortfolioEvaluationObjectionHandleActionDescription,
  PortfolioEvaluationObjectionStatusCode,
  PortfolioEvaluationObjectionStatusDescription,
  PortfolioEvaluationObjectionTypeCode,
  PortfolioEvaluationObjectionTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationPublicityApi } from '@/apis/portfolio/evaluation-publicity'
import {
  PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_TONE,
  PORTFOLIO_EVALUATION_OBJECTION_STATUS_TONE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const HANDLE_ACTION_OPTIONS: PortfolioEvaluationObjectionHandleActionCode[] = [
  PortfolioEvaluationObjectionHandleActionCode.MAINTAIN,
  PortfolioEvaluationObjectionHandleActionCode.CORRECT,
  PortfolioEvaluationObjectionHandleActionCode.REVOKE,
  PortfolioEvaluationObjectionHandleActionCode.RE_REVIEW,
]

function statusLabel(status: PortfolioEvaluationObjectionStatusCode): string {
  return strictEnumLabel(PortfolioEvaluationObjectionStatusDescription, status, '评价异议状态')
}

function statusTone(status: PortfolioEvaluationObjectionStatusCode) {
  return strictEnumTone(PORTFOLIO_EVALUATION_OBJECTION_STATUS_TONE, status, '评价异议状态')
}

function actionLabel(action: PortfolioEvaluationObjectionHandleActionCode): string {
  return strictEnumLabel(
    PortfolioEvaluationObjectionHandleActionDescription,
    action,
    '评价异议复核动作',
  )
}

function actionTone(action: PortfolioEvaluationObjectionHandleActionCode) {
  return strictEnumTone(
    PORTFOLIO_EVALUATION_OBJECTION_HANDLE_ACTION_TONE,
    action,
    '评价异议复核动作',
  )
}

function requiresDangerConfirm(action: PortfolioEvaluationObjectionHandleActionCode): boolean {
  return (
    action === PortfolioEvaluationObjectionHandleActionCode.REVOKE
    || action === PortfolioEvaluationObjectionHandleActionCode.RE_REVIEW
  )
}

const STATUS_FILTER_OPTIONS: Array<{
  value: '' | PortfolioEvaluationObjectionStatusCode
  label: string
}> = [
  { value: PortfolioEvaluationObjectionStatusCode.SUBMITTED, label: '待复核' },
  { value: '', label: '全部记录' },
  { value: PortfolioEvaluationObjectionStatusCode.UPHELD, label: '已成立' },
  { value: PortfolioEvaluationObjectionStatusCode.REJECTED, label: '已驳回' },
  { value: PortfolioEvaluationObjectionStatusCode.CLOSED, label: '已关闭' },
]

function requiresCorrectedScore(objectionType: PortfolioEvaluationObjectionTypeCode): boolean {
  return (
    objectionType === PortfolioEvaluationObjectionTypeCode.RESULT_DISPUTE
    || objectionType === PortfolioEvaluationObjectionTypeCode.SCORE_DISPUTE
  )
}

function requiresOpinion(action: PortfolioEvaluationObjectionHandleActionCode): boolean {
  return (
    action === PortfolioEvaluationObjectionHandleActionCode.MAINTAIN
    || action === PortfolioEvaluationObjectionHandleActionCode.RE_REVIEW
  )
}

const route = useRoute()
const loading = ref(false)
const handlingId = ref('')
const rows = ref<PortfolioEvaluationObjectionSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const reviewDrawerOpen = ref(false)
const reviewTarget = ref<PortfolioEvaluationObjectionSummaryVO | null>(null)
const reviewForm = reactive({
  action: PortfolioEvaluationObjectionHandleActionCode.CORRECT,
  handleOpinion: '',
  correctedScore: undefined,
})

const evaluationTaskId = ref(
  typeof route.query.evaluationTaskId === 'string' ? route.query.evaluationTaskId : '',
)
const objectionStatusFilter = ref<'' | PortfolioEvaluationObjectionStatusCode>(
  PortfolioEvaluationObjectionStatusCode.SUBMITTED,
)

const showCorrectedScore = computed(() => {
  if (!reviewTarget.value) {
    return false
  }
  return (
    reviewForm.action === PortfolioEvaluationObjectionHandleActionCode.CORRECT
    && requiresCorrectedScore(reviewTarget.value.objectionType)
  )
})

const columns: ColumnsType<PortfolioEvaluationObjectionSummaryVO> = [
  { title: '教师', key: 'teacherName', width: 120 },
  { title: '任务', dataIndex: 'taskName', key: 'taskName' },
  { title: '公示标题', dataIndex: 'publicityTitle', key: 'publicityTitle' },
  { title: '异议类型', key: 'objectionType', width: 120 },
  { title: '状态', key: 'objectionStatus', width: 110 },
  { title: '复核结论', key: 'handleAction', width: 120 },
  { title: '理由', dataIndex: 'objectionReason', key: 'objectionReason' },
  { title: '佐证', key: 'evidenceRef', width: 100, align: 'center' },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

async function downloadEvidence(row: PortfolioEvaluationObjectionSummaryVO) {
  if (!row.evidenceRef) {
    return
  }
  await handleDownloadFile({ fileId: row.evidenceRef })
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioEvaluationPublicityApi.pageObjections({
      ...(evaluationTaskId.value ? { evaluationTaskId: evaluationTaskId.value } : {}),
      ...(objectionStatusFilter.value ? { objectionStatus: objectionStatusFilter.value } : {}),
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    rows.value = page.list
    pageTotal.value = page.total
  } catch (error) {
    showUserError(error, '加载公示异议失败')
  } finally {
    loading.value = false
  }
}

async function submitReview() {
  if (!reviewTarget.value) {
    return
  }
  const opinion = reviewForm.handleOpinion.trim()
  if (requiresOpinion(reviewForm.action) && !opinion) {
    message.warning(
      reviewForm.action === PortfolioEvaluationObjectionHandleActionCode.MAINTAIN
        ? '维持原结果须填写复核意见'
        : '重新评审须填写复核说明',
    )
    return
  }
  if (showCorrectedScore.value && reviewForm.correctedScore == null) {
    message.warning('修正评价结果时须填写修正得分')
    return
  }
  if (requiresDangerConfirm(reviewForm.action)) {
    const confirmed = await confirmAsync({
      type: 'error',
      title:
        reviewForm.action === PortfolioEvaluationObjectionHandleActionCode.REVOKE
          ? '确认撤销评价结论？'
          : '确认退回重新评审？',
      content:
        reviewForm.action === PortfolioEvaluationObjectionHandleActionCode.REVOKE
          ? '将软删该教师当前评价条目并重算画像，操作不可自动恢复。'
          : '将关闭公示、软删评价条目并回退任务至专家评审，需重新组织评审。',
      okText: '确认提交',
    })
    if (!confirmed) {
      return
    }
  }
  handlingId.value = reviewTarget.value.objectionId
  try {
    await portfolioEvaluationPublicityApi.handleObjection({
      objectionId: reviewTarget.value.objectionId,
      action: reviewForm.action,
      ...(opinion ? { handleOpinion: opinion } : {}),
      ...(reviewForm.correctedScore != null ? { correctedScore: reviewForm.correctedScore } : {}),
    })
    message.success('复核完成')
    reviewDrawerOpen.value = false
    reviewTarget.value = null
    reviewForm.action = PortfolioEvaluationObjectionHandleActionCode.CORRECT
    reviewForm.handleOpinion = ''
    reviewForm.correctedScore = undefined
    await loadPage()
  } catch (error) {
    showUserError(error, '复核异议失败')
  } finally {
    handlingId.value = ''
  }
}

function openReviewDrawer(row: PortfolioEvaluationObjectionSummaryVO) {
  reviewTarget.value = row
  reviewForm.action = requiresCorrectedScore(row.objectionType)
    ? PortfolioEvaluationObjectionHandleActionCode.CORRECT
    : PortfolioEvaluationObjectionHandleActionCode.MAINTAIN
  reviewForm.handleOpinion = ''
  reviewForm.correctedScore = undefined
  reviewDrawerOpen.value = true
}

watch(
  () => route.query.evaluationTaskId,
  (value) => {
    evaluationTaskId.value = typeof value === 'string' ? value : ''
    pageNum.value = 1
    void loadPage()
  },
)

function onStatusFilterChange() {
  pageNum.value = 1
  void loadPage()
}

/** 组装异议佐证下载操作。 */
function buildEvidenceActions(row: PortfolioEvaluationObjectionSummaryVO): UiTableRowActionItem[] {
  if (!row.evidenceRef) {
    return []
  }
  return [{ key: 'download', label: '下载' }]
}

function handleEvidenceAction(key: string, row: PortfolioEvaluationObjectionSummaryVO): void {
  if (key === 'download') {
    void downloadEvidence(row)
  }
}

/** 组装异议工单行内操作。 */
function buildObjectionRowActions(
  row: PortfolioEvaluationObjectionSummaryVO,
): UiTableRowActionItem[] {
  if (row.objectionStatus !== PortfolioEvaluationObjectionStatusCode.SUBMITTED) {
    return []
  }
  return [
    {
      key: 'review',
      label: '复核',
      tone: 'primary',
      disabled: handlingId.value === row.objectionId,
    },
  ]
}

function handleObjectionRowAction(key: string, row: PortfolioEvaluationObjectionSummaryVO): void {
  if (key === 'review') {
    openReviewDrawer(row)
  }
}

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="公示异议" description="院系复核教师评价公示异议">
      <template #actions>
        <Select
          v-model:value="objectionStatusFilter"
          class="department-objection__status-filter"
          :options="STATUS_FILTER_OPTIONS"
          @change="onStatusFilterChange"
        />
        <UiButton :loading="loading" @click="() => void loadPage()"> 刷新 </UiButton>
      </template>
    </ContextBar>

    <UiCard title="异议工单">
      <UiDataTable
        v-if="rows.length || loading"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        row-key="objectionId"
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherName'">
            {{ record.teacherName }}
          </template>
          <template v-else-if="column.key === 'objectionType'">
            {{
              strictEnumLabel(
                PortfolioEvaluationObjectionTypeDescription,
                record.objectionType,
                '评价异议类型',
              )
            }}
          </template>
          <template v-else-if="column.key === 'objectionStatus'">
            <UiTag :tone="statusTone(record.objectionStatus)">
              {{ statusLabel(record.objectionStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'handleAction'">
            <UiTag v-if="record.handleAction" :tone="actionTone(record.handleAction)">
              {{ actionLabel(record.handleAction) }}
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'evidenceRef'">
            <UiTableActions
              v-if="record.evidenceRef"
              :items="buildEvidenceActions(record)"
              :split="false"
              @action="(key) => handleEvidenceAction(key, record)"
            />
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="record.objectionStatus === PortfolioEvaluationObjectionStatusCode.SUBMITTED"
              :items="buildObjectionRowActions(record)"
              :split="false"
              @action="(key) => handleObjectionRowAction(key, record)"
            />
            <span v-else-if="record.handleOpinion" class="department-objection__opinion">
              {{ record.handleOpinion }}
            </span>
          </template>
        </template>
      </UiDataTable>
      <UiEmpty
        v-else
        :description="
          objectionStatusFilter === PortfolioEvaluationObjectionStatusCode.SUBMITTED
            ? '暂无待复核异议'
            : '暂无异议记录'
        "
      />
    </UiCard>

    <UiDrawer v-model:open="reviewDrawerOpen" title="异议复核" width="420">
      <p v-if="reviewTarget" class="department-objection__meta">
        {{ reviewTarget.teacherName }} · {{ reviewTarget.taskName }}
      </p>
      <Select
        v-model:value="reviewForm.action"
        class="department-objection__field"
        :options="HANDLE_ACTION_OPTIONS.map((value) => ({ value, label: actionLabel(value) }))"
        placeholder="复核结论"
      />
      <InputNumber
        v-if="showCorrectedScore"
        v-model:value="reviewForm.correctedScore"
        class="department-objection__field"
        :min="0"
        :max="100"
        :precision="2"
        placeholder="修正得分"
        style="width: 100%"
      />
      <Input.TextArea
        v-model:value="reviewForm.handleOpinion"
        :rows="4"
        :placeholder="requiresOpinion(reviewForm.action) ? '请填写复核意见' : '复核意见（选填）'"
      />
      <template #footer>
        <UiButton variant="ghost" @click="reviewDrawerOpen = false"> 取消 </UiButton>
        <UiButton
          variant="primary"
          :loading="handlingId === reviewTarget?.objectionId"
          @click="() => void submitReview()"
        >
          提交复核
        </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.department-objection__status-filter {
  width: 140px;
  margin-right: var(--dp-space-2, 8px);
}

.department-objection__meta {
  margin: 0 0 var(--dp-space-3, 12px);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.department-objection__field {
  display: block;
  width: 100%;
  margin-bottom: var(--dp-space-3, 12px);
}

.department-objection__opinion {
  font-size: 14px;
  color: var(--dp-text-secondary);
}
</style>
