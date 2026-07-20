<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioEvaluationObjectionPeerScoreItemVO,
  PortfolioEvaluationObjectionReviewPackageVO,
  PortfolioEvaluationObjectionScoreBasisItemVO,
  PortfolioEvaluationObjectionSummaryVO,
} from '@/apis/portfolio/types'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  PortfolioEvaluationObjectionHandleActionCode,
  PortfolioEvaluationObjectionHandleActionDescription,
  PortfolioEvaluationObjectionStatusCode,
  PortfolioEvaluationObjectionStatusDescription,
  PortfolioEvaluationObjectionTypeCode,
  PortfolioEvaluationObjectionTypeDescription,
  PortfolioEvaluationSceneDescription,
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
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
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

const route = useRoute()
const loading = ref(false)
const exporting = ref(false)
const handlingId = ref('')
const rows = ref<PortfolioEvaluationObjectionSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const pageRequestToken = ref(0)
const reviewContextToken = ref(0)
const reviewDrawerOpen = ref(false)
const reviewTarget = ref<PortfolioEvaluationObjectionSummaryVO | null>(null)
const reviewForm = reactive({
  action: PortfolioEvaluationObjectionHandleActionCode.CORRECT,
  handleOpinion: '',
  correctedScore: undefined as number | undefined,
})
const reviewPackage = ref<PortfolioEvaluationObjectionReviewPackageVO | null>(null)
const reviewPackageLoading = ref(false)
const scoreBasisColumns: ColumnsType<PortfolioEvaluationObjectionScoreBasisItemVO> = [
  { title: '匿名专家', dataIndex: 'anonymousExpertLabel', key: 'anonymousExpertLabel', width: 100 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 120 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 80 },
  { title: '评分依据', dataIndex: 'commentText', key: 'commentText' },
]
const peerScoreColumns: ColumnsType<PortfolioEvaluationObjectionPeerScoreItemVO> = [
  { title: '匿名专家', dataIndex: 'anonymousExpertLabel', key: 'anonymousExpertLabel', width: 100 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 120 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 80 },
]

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

function lifecycleTagTone(record: { lifecycleStatus?: string }): 'green' | 'orange' | 'neutral' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'neutral'
}

function evaluationSceneLabel(
  scene?: PortfolioEvaluationObjectionSummaryVO['sceneCode'],
): string {
  if (!scene) {
    return '—'
  }
  return strictEnumLabel(PortfolioEvaluationSceneDescription, scene, '评价任务场景')
}

const columns: ColumnsType<PortfolioEvaluationObjectionSummaryVO> = [
  { title: '教师', key: 'teacherName', width: 120, fixed: 'left' },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '任务', dataIndex: 'taskName', key: 'taskName' },
  { title: '场景', dataIndex: 'sceneCode', key: 'sceneCode', width: 120 },
  { title: '公示标题', dataIndex: 'publicityTitle', key: 'publicityTitle' },
  { title: '异议类型', key: 'objectionType', width: 120 },
  { title: '争议指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 150 },
  { title: '状态', key: 'objectionStatus', width: 110 },
  { title: '复核结论', key: 'handleAction', width: 120 },
  { title: '理由', dataIndex: 'objectionReason', key: 'objectionReason' },
  { title: '佐证', key: 'evidenceRef', width: 100, align: 'center' },
  { title: '操作', key: 'actions', width: 120 },
]

/** 深链任务切换后必须清空旧复核上下文，避免继续操作上一任务的异议单。 */
function resetReviewContext() {
  reviewDrawerOpen.value = false
  reviewTarget.value = null
  reviewPackage.value = null
  reviewPackageLoading.value = false
  reviewForm.action = PortfolioEvaluationObjectionHandleActionCode.CORRECT
  reviewForm.handleOpinion = ''
  reviewForm.correctedScore = undefined
}

async function downloadEvidence(row: PortfolioEvaluationObjectionSummaryVO) {
  if (!row.evidenceRef) {
    return
  }
  await handleDownloadFile({ fileId: row.evidenceRef })
}

/** 深链 objectionId 是否已尝试打开（防止 loadPage 循环与重复弹抽屉）。 */
const deepLinkObjectionApplied = ref(false)

/**
 * PF-P0-291：消费站内信 objectionId 深链，打开对应异议复核抽屉；禁止只落到任务筛选列表。
 * @returns 若需清筛选后重载则返回 true
 */
function applyDeepLinkedObjection(): boolean {
  const deepLinkedObjectionId
    = typeof route.query.objectionId === 'string' ? route.query.objectionId.trim() : ''
  if (!deepLinkedObjectionId || deepLinkObjectionApplied.value) {
    return false
  }
  const hit = rows.value.find((item) => item.objectionId === deepLinkedObjectionId)
  if (hit) {
    deepLinkObjectionApplied.value = true
    void openReviewDrawer(hit)
    return false
  }
  if (objectionStatusFilter.value) {
    // 深链目标可能不在默认 SUBMITTED 筛选中，清状态后由调用方重载一次
    objectionStatusFilter.value = ''
    pageNum.value = 1
    return true
  }
  deepLinkObjectionApplied.value = true
  return false
}

async function loadPage() {
  const currentToken = pageRequestToken.value + 1
  pageRequestToken.value = currentToken
  const request = {
    ...(evaluationTaskId.value ? { evaluationTaskId: evaluationTaskId.value } : {}),
    ...(objectionStatusFilter.value ? { objectionStatus: objectionStatusFilter.value } : {}),
    pageNum: pageNum.value,
    pageSize: pageSize.value,
  }
  loading.value = true
  try {
    const page = await portfolioEvaluationPublicityApi.pageObjections(request)
    if (pageRequestToken.value !== currentToken) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
    if (
      reviewTarget.value
      && !rows.value.some((item) => item.objectionId === reviewTarget.value?.objectionId)
    ) {
      resetReviewContext()
    }
    if (applyDeepLinkedObjection()) {
      // 清筛选后重载以命中非 SUBMITTED 或跨状态目标
      void loadPage()
    }
  } catch (error) {
    if (pageRequestToken.value !== currentToken) {
      return
    }
    rows.value = []
    pageTotal.value = 0
    resetReviewContext()
    showUserError(error, '加载公示异议失败')
  } finally {
    if (pageRequestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function submitReview() {
  if (!reviewTarget.value) {
    return
  }
  const opinion = reviewForm.handleOpinion.trim()
  if (!opinion) {
    showFormValidationMessage('请填写异议复核处理意见')
    return
  }
  if (showCorrectedScore.value && reviewForm.correctedScore == null) {
    showFormValidationMessage('修正评价结果时须填写修正得分')
    return
  }
  if (handlingId.value) {
    return
  }
  const contextToken = reviewContextToken.value
  const objectionId = reviewTarget.value.objectionId
  const action = reviewForm.action
  const request = {
    objectionId,
    action,
    handleOpinion: opinion,
    ...(reviewForm.correctedScore != null ? { correctedScore: reviewForm.correctedScore } : {}),
  }
  handlingId.value = objectionId
  if (requiresDangerConfirm(action)) {
    const confirmed = await confirmAsync({
      type: 'error',
      title:
        action === PortfolioEvaluationObjectionHandleActionCode.REVOKE
          ? '确认撤销评价结论？'
          : '确认退回重新评审？',
      content:
        action === PortfolioEvaluationObjectionHandleActionCode.REVOKE
          ? `将撤销${reviewTarget.value.indicatorCode ? `指标“${reviewTarget.value.indicatorCode}”的` : '该教师全部'}当前评价条目并重算画像，操作不可自动恢复。`
          : `将关闭公示、撤销${reviewTarget.value.indicatorCode ? `指标“${reviewTarget.value.indicatorCode}”的` : '该教师全部'}评价条目并回退任务至专家评审，需重新组织评审。`,
      okText: '确认提交',
    })
    if (!confirmed || reviewContextToken.value !== contextToken) {
      if (reviewContextToken.value === contextToken && handlingId.value === objectionId) {
        handlingId.value = ''
      }
      return
    }
  }
  try {
    await portfolioEvaluationPublicityApi.handleObjection(request)
    if (reviewContextToken.value !== contextToken) {
      return
    }
    message.success('复核完成')
    resetReviewContext()
    await loadPage()
  } catch (error) {
    if (reviewContextToken.value !== contextToken) {
      return
    }
    showUserError(error, '复核异议失败')
  } finally {
    if (reviewContextToken.value === contextToken && handlingId.value === objectionId) {
      handlingId.value = ''
    }
  }
}

async function openReviewDrawer(row: PortfolioEvaluationObjectionSummaryVO) {
  reviewTarget.value = row
  reviewForm.action = requiresCorrectedScore(row.objectionType)
    ? PortfolioEvaluationObjectionHandleActionCode.CORRECT
    : PortfolioEvaluationObjectionHandleActionCode.MAINTAIN
  reviewForm.handleOpinion = ''
  reviewForm.correctedScore = undefined
  reviewPackage.value = null
  reviewDrawerOpen.value = true
  const contextToken = reviewContextToken.value
  reviewPackageLoading.value = true
  try {
    const pack = await portfolioEvaluationPublicityApi.getObjectionReviewPackage({
      objectionId: row.objectionId,
    })
    if (reviewContextToken.value !== contextToken) {
      return
    }
    reviewPackage.value = pack
  } catch (error) {
    if (reviewContextToken.value !== contextToken) {
      return
    }
    showUserError(error, '加载异议复核材料包失败')
  } finally {
    if (reviewContextToken.value === contextToken) {
      reviewPackageLoading.value = false
    }
  }
}

watch(
  () => [route.query.evaluationTaskId, route.query.objectionId],
  ([taskId]) => {
    reviewContextToken.value += 1
    pageRequestToken.value += 1
    loading.value = false
    handlingId.value = ''
    rows.value = []
    pageTotal.value = 0
    evaluationTaskId.value = typeof taskId === 'string' ? taskId : ''
    pageNum.value = 1
    deepLinkObjectionApplied.value = false
    resetReviewContext()
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
      disabled: Boolean(handlingId.value),
    },
  ]
}

function handleObjectionRowAction(key: string, row: PortfolioEvaluationObjectionSummaryVO): void {
  if (key === 'review') {
    void openReviewDrawer(row)
  }
}


/** 导出异议台账 Excel（含业务场景）。 */
async function exportObjectionExcel(): Promise<void> {
  if (exporting.value || loading.value || Boolean(handlingId.value)) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioEvaluationPublicityApi.exportObjectionExcel({
      pageNum: 1,
      pageSize: pageSize.value,
      objectionStatus: objectionStatusFilter.value || undefined,
    })
    await downloadPortfolioExcelExport(result)
  } finally {
    exporting.value = false
  }
}

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="公示异议">
        <template #actions>
          <UiSelect
            v-model="objectionStatusFilter"
            size="sm"
            class="department-objection__status-filter"
            :options="STATUS_FILTER_OPTIONS"
            :disabled="Boolean(handlingId)"
            @change="onStatusFilterChange"
          />
          <UiButton
            size="sm"
            variant="primary"
            :loading="exporting"
            :disabled="exporting || loading || Boolean(handlingId)"
            @click="() => void exportObjectionExcel()"
          >
            导出台账
          </UiButton>
          <UiButton size="sm" :loading="loading" :disabled="Boolean(handlingId) || exporting" @click="() => void loadPage()">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

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
          <template v-else-if="column.key === 'indicatorCode'">
            {{ record.indicatorCode || '按人评价' }}
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
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <div v-if="record.ownerIdentityLayers?.length" class="flex flex-wrap gap-1">
              <UiTag
                v-for="(layer, i) in record.ownerIdentityLayers"
                :key="`${layer.identityType || 'id'}-${i}`"
                tone="neutral"
              >
                {{ layer.identityTypeLabel || layer.identityType }}
              </UiTag>
            </div>
            <span v-else class="text-neutral-400">—</span>
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            <UiTag
              :tone="
                record.countsInCurrentFacultyStructure === true
                  ? 'green'
                  : record.countsInCurrentFacultyStructure === false
                    ? 'neutral'
                    : 'neutral'
              "
            >
              {{
                record.countsInCurrentFacultyStructure === true
                  ? '是'
                  : record.countsInCurrentFacultyStructure === false
                    ? '否'
                    : '-'
              }}
            </UiTag>
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
        size="sm"
        v-else
        :description="
          objectionStatusFilter === PortfolioEvaluationObjectionStatusCode.SUBMITTED
            ? '暂无待复核异议'
            : '暂无异议记录'
        "
      />
    </UiCard>

    <UiDrawer v-model:open="reviewDrawerOpen" title="异议复核" width="640">
      <p v-if="reviewTarget" class="department-objection__meta">
        {{ reviewTarget.teacherName }} · {{ reviewTarget.taskName }}
        <template v-if="reviewTarget.indicatorCode"> · 指标 {{ reviewTarget.indicatorCode }}</template>
      </p>
      <section class="department-objection__review-section">
        <h3 class="department-objection__section-title">评分依据与同组分布</h3>
        <p v-if="reviewPackageLoading" class="department-objection__section-hint">材料包加载中…</p>
        <template v-else-if="reviewPackage">
          <p class="department-objection__section-hint">
            争议条目 {{ reviewPackage.scopedEntryCount ?? 0 }} 条；
            均分 {{ reviewPackage.scopedAverageScore ?? '—' }}；
            区间 {{ reviewPackage.peerMinScore ?? '—' }} ~ {{ reviewPackage.peerMaxScore ?? '—' }}；
            中位 {{ reviewPackage.peerMedianScore ?? '—' }}
          </p>
          <UiDataTable
            class="department-objection__score-basis"
            size="sm"
            :columns="scoreBasisColumns"
            :data-source="reviewPackage.scoreBasis ?? []"
            :pagination="false"
            row-key="entryId"
          />
          <UiDataTable
            class="department-objection__peer-scores"
            size="sm"
            :columns="peerScoreColumns"
            :data-source="reviewPackage.peerScoreDistribution ?? []"
            :pagination="false"
            :row-key="(row) => `${row.anonymousExpertLabel || ''}-${row.indicatorCode || ''}-${row.score ?? ''}`"
          />
          <div class="department-objection__materials">
            <span class="department-objection__materials-label">材料引用</span>
            <template v-if="(reviewPackage.materialCategories ?? []).length">
              <UiTag
                v-for="item in reviewPackage.materialCategories"
                :key="String(item.categoryId)"
                size="sm"
                :tone="item.completed ? 'success' : 'warning'"
              >
                {{ item.categoryName || item.categoryId }}
              </UiTag>
            </template>
            <span v-else class="department-objection__section-hint">暂无档案分类材料引用</span>
            <p v-if="reviewPackage.teacherEvidenceRef" class="department-objection__section-hint">
              教师佐证：{{ reviewPackage.teacherEvidenceRef }}
            </p>
          </div>
        </template>
        <p v-else class="department-objection__section-hint">复核材料包暂不可用，仍可填写复核结论。</p>
      </section>
      <UiSelect
        v-model="reviewForm.action"
        size="sm"
        class="department-objection__field"
        :options="HANDLE_ACTION_OPTIONS.map((value) => ({ value, label: actionLabel(value) }))"
        :disabled="Boolean(handlingId)"
        placeholder="复核结论"
      />
      <UiInputNumber
        v-if="showCorrectedScore"
        v-model="reviewForm.correctedScore"
        size="sm"
        class="department-objection__field"
        :min="0"
        :max="100"
        :precision="2"
        :disabled="Boolean(handlingId)"
        placeholder="修正得分"
      />
      <UiTextarea
        v-model="reviewForm.handleOpinion"
        size="sm"
        :rows="4"
        :disabled="Boolean(handlingId)"
        placeholder="请填写复核意见"
      />
      <template #footer>
        <UiButton size="sm" variant="ghost" :disabled="Boolean(handlingId)" @click="reviewDrawerOpen = false">
          取消
        </UiButton>
        <UiButton
          size="sm"
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
  margin-right: var(--dp-space-2);
}

.department-objection__meta {
  margin: 0 0 var(--dp-space-3);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.department-objection__review-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: var(--dp-space-3);
}

.department-objection__section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.department-objection__section-hint {
  margin: 0;
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.department-objection__materials {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.department-objection__materials-label {
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.department-objection__field {
  display: block;
  width: 100%;
  margin-bottom: var(--dp-space-3);
}

.department-objection__opinion {
  font-size: 14px;
  color: var(--dp-text-secondary);
}
</style>
