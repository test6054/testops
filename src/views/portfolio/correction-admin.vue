<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioCorrectionImpactVO,
  PortfolioCorrectionSummaryVO,
} from '@/apis/portfolio/types'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioCorrectionApi } from '@/apis/portfolio/correction'
import {
  PortfolioCorrectionHandleActionCode,
  PortfolioCorrectionImpactRecomputeStatusCode,
  PortfolioCorrectionImpactRecomputeStatusDescription,
  PortfolioCorrectionRequestStatusCode,
  PortfolioCorrectionRequestStatusDescription,
} from '@/apis/portfolio/enums'
import {
  PORTFOLIO_CORRECTION_IMPACT_RECOMPUTE_STATUS_TONE,
  PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

function statusLabel(status: PortfolioCorrectionRequestStatusCode): string {
  return strictEnumLabel(PortfolioCorrectionRequestStatusDescription, status, '纠错工单状态')
}

function statusTone(status: PortfolioCorrectionRequestStatusCode) {
  return strictEnumTone(PORTFOLIO_CORRECTION_REQUEST_STATUS_TONE, status, '纠错工单状态')
}

function impactStatusLabel(status: PortfolioCorrectionImpactRecomputeStatusCode): string {
  return strictEnumLabel(
    PortfolioCorrectionImpactRecomputeStatusDescription,
    status,
    '纠错影响重算状态',
  )
}

function impactStatusTone(status: PortfolioCorrectionImpactRecomputeStatusCode) {
  return strictEnumTone(
    PORTFOLIO_CORRECTION_IMPACT_RECOMPUTE_STATUS_TONE,
    status,
    '纠错影响重算状态',
  )
}

const loading = ref(false)
const handlingId = ref('')
const rows = ref<PortfolioCorrectionSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const pageTotal = ref(0)
const rejectDrawerOpen = ref(false)
const rejectTarget = ref<PortfolioCorrectionSummaryVO | null>(null)
const rejectForm = reactive({ handleOpinion: '' })
const listRequestToken = ref(0)
const impactDrawerOpen = ref(false)
const impactLoading = ref(false)
const impactRecomputing = ref(false)
const impactDetail = ref<PortfolioCorrectionImpactVO | null>(null)
const impactTarget = ref<PortfolioCorrectionSummaryVO | null>(null)
const impactRequestToken = ref(0)
const route = useRoute()
const deepLinkHint = ref('')

const operationPending = computed(() => Boolean(handlingId.value) || impactRecomputing.value)

/** 当前操作目标教师；封存写禁预检 */
const actionTeacherId = ref<string | undefined>()
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: actionTeacherId })

async function bindActionTeacherAndAssert(
  teacherId: string | number | undefined | null,
  actionLabel: string,
): Promise<boolean> {
  actionTeacherId.value
    = teacherId != null && String(teacherId).trim() !== '' ? String(teacherId) : undefined
  await reloadLifecycleState()
  return assertArchiveWritable(actionLabel)
}

const columns: ColumnsType<PortfolioCorrectionSummaryVO> = [
  { title: '教师', key: 'teacherName', width: 120, fixed: 'left' },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 120 },
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 120 },
  { title: '状态', key: 'requestStatus', width: 110 },
  { title: '原因', dataIndex: 'reason', key: 'reason' },
  { title: '操作', key: 'actions', width: 260 },
]

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

/** 列表刷新或处理完成后必须清空失效的驳回上下文，避免继续操作旧工单。 */
function resetRejectContext() {
  rejectDrawerOpen.value = false
  rejectTarget.value = null
  rejectForm.handleOpinion = ''
}

async function loadPage() {
  const currentToken = ++listRequestToken.value
  loading.value = true
  try {
    const page = await portfolioCorrectionApi.pageCorrections({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (currentToken !== listRequestToken.value) {
      return
    }
    rows.value = page.list
    pageTotal.value = page.total
    if (rejectTarget.value && !rows.value.some((item) => item.id === rejectTarget.value?.id)) {
      resetRejectContext()
    }
    await applyDeepLinkedRequest()
  } catch (error) {
    if (currentToken === listRequestToken.value) {
      rows.value = []
      pageTotal.value = 0
      showUserError(error, '加载纠错工单失败')
    }
  } finally {
    if (currentToken === listRequestToken.value) {
      loading.value = false
    }
  }
}

/**
 * PF-P0-386：消费 requestId 深链提示目标工单，站内信可行动。
 */
async function applyDeepLinkedRequest() {
  const requestId = typeof route.query.requestId === 'string' ? route.query.requestId.trim() : ''
  if (!requestId) {
    deepLinkHint.value = ''
    return
  }
  const inPage = rows.value.find((item) => item.id === requestId)
  if (inPage) {
    deepLinkHint.value = `深链工单 #${requestId}：${inPage.fieldLabel || inPage.fieldCode || ''}（${statusLabel(inPage.requestStatus)}）`
    return
  }
  try {
    const detail = await portfolioCorrectionApi.getCorrection(requestId)
    deepLinkHint.value = `深链工单 #${requestId}：${detail.fieldLabel || detail.fieldCode || ''}（${statusLabel(detail.requestStatus)}），请按教师筛选或翻页定位处理`
  } catch (error) {
    deepLinkHint.value = ''
    showUserError(error, '加载深链纠错工单失败')
  }
}

async function handleRow(
  row: PortfolioCorrectionSummaryVO,
  action: PortfolioCorrectionHandleActionCode,
  handleOpinion?: string,
) {
  if (operationPending.value) {
    return
  }
  if (!(await bindActionTeacherAndAssert(row.teacherId, '纠错处理'))) {
    return
  }
  handlingId.value = row.id
  try {
    await portfolioCorrectionApi.handleCorrection({
      correctionRequestId: row.id,
      action,
      ...(handleOpinion ? { handleOpinion } : {}),
    })
    void message.success('处理成功')
    resetRejectContext()
    await loadPage()
  } catch (error) {
    showUserError(error, '处理纠错失败')
  } finally {
    handlingId.value = ''
  }
}

function openRejectDrawer(row: PortfolioCorrectionSummaryVO) {
  rejectTarget.value = row
  rejectForm.handleOpinion = ''
  rejectDrawerOpen.value = true
}

async function submitReject() {
  if (!rejectTarget.value) {
    return
  }
  const opinion = rejectForm.handleOpinion.trim()
  if (!opinion) {
    showFormValidationMessage('请填写驳回意见')
    return
  }
  await handleRow(rejectTarget.value, PortfolioCorrectionHandleActionCode.REJECT, opinion)
}

/** 组装纠错工单行内操作。 */
function buildCorrectionRowActions(row: PortfolioCorrectionSummaryVO): UiTableRowActionItem[] {
  const busy = operationPending.value
  const actions: UiTableRowActionItem[] = []
  if (row.requestStatus === PortfolioCorrectionRequestStatusCode.SUBMITTED) {
    actions.push({
      key: 'accept',
      label: '受理',
      tone: 'primary',
      disabled: busy,
    })
  }
  if (row.requestStatus === 'ACCEPTING') {
    actions.push(
      { key: 'reject', label: '驳回', tone: 'danger', disabled: busy },
      { key: 'archiveCorrect', label: '档案更正', disabled: busy },
      { key: 'sourceFix', label: '源系统整改', disabled: busy },
    )
  }
  if (row.requestStatus === 'PENDING_VERIFY' || row.requestStatus === 'ARCHIVE_CORRECTING') {
    actions.push({
      key: 'close',
      label: '关闭',
      tone: 'primary',
      disabled: busy,
    })
  }
  if (row.requestStatus === PortfolioCorrectionRequestStatusCode.CLOSED) {
    actions.push({ key: 'impact', label: '影响报告', tone: 'primary', disabled: busy })
  }
  return actions
}

/** 打开已关闭纠错工单的影响范围与重算结果。 */
async function openImpact(row: PortfolioCorrectionSummaryVO) {
  const currentToken = ++impactRequestToken.value
  impactTarget.value = row
  impactDetail.value = null
  impactDrawerOpen.value = true
  impactLoading.value = true
  try {
    const detail = await portfolioCorrectionApi.getImpact(row.id)
    if (currentToken !== impactRequestToken.value || impactTarget.value?.id !== row.id) {
      return
    }
    impactDetail.value = detail
  } catch (error) {
    if (currentToken === impactRequestToken.value && impactTarget.value?.id === row.id) {
      showUserError(error, '加载纠错影响报告失败')
    }
  } finally {
    if (currentToken === impactRequestToken.value) {
      impactLoading.value = false
    }
  }
}

/** 对待重算或失败报告执行人工重试，并以服务端最新状态刷新抽屉。 */
async function recomputeImpact() {
  const target = impactTarget.value
  if (!target || !impactDetail.value || operationPending.value) {
    return
  }
  if (!impactDetail.value.retryAllowed) {
    return
  }
  if (!(await bindActionTeacherAndAssert(target.teacherId, '纠错影响重算'))) {
    return
  }
  impactRecomputing.value = true
  try {
    impactDetail.value = await portfolioCorrectionApi.recomputeImpact(target.id)
    void message.success('纠错影响重算完成')
  } catch (error) {
    showUserError(error, '纠错影响重算失败')
    await openImpact(target)
  } finally {
    impactRecomputing.value = false
  }
}

function resetImpactContext() {
  impactRequestToken.value += 1
  impactDrawerOpen.value = false
  impactLoading.value = false
  impactDetail.value = null
  impactTarget.value = null
}

function handleCorrectionRowAction(key: string, row: PortfolioCorrectionSummaryVO): void {
  switch (key) {
    case 'accept':
      void handleRow(row, PortfolioCorrectionHandleActionCode.ACCEPT)
      break
    case 'reject':
      openRejectDrawer(row)
      break
    case 'archiveCorrect':
      void handleRow(row, PortfolioCorrectionHandleActionCode.MARK_ARCHIVE_CORRECTING)
      break
    case 'sourceFix':
      void handleRow(row, PortfolioCorrectionHandleActionCode.MARK_SOURCE_FIXING)
      break
    case 'close':
      void handleRow(row, PortfolioCorrectionHandleActionCode.CLOSE)
      break
    case 'impact':
      void openImpact(row)
      break
  }
}

void loadPage()
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="纠错处理"
        subtitle="管理端受理与流转纠错工单"
      >
        <template #actions>
          <UiButton size="sm" :loading="loading" @click="() => void loadPage()"> 刷新 </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
    />

    <UiAlertStrip
      v-if="deepLinkHint"
      tone="info"
      title="站内信深链工单"
      :description="deepLinkHint"
    />

    <UiCard title="纠错工单">
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
        @page-change="() => void loadPage()"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherName'">
            {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>

            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id || record.teacherId || record.teacherUserId || record.userId"
            />
          </template>
          <template v-else-if="column.key === 'requestStatus'">
            <UiTag :tone="statusTone(record.requestStatus)">
              {{ statusLabel(record.requestStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildCorrectionRowActions(record)"
              @action="(key) => handleCorrectionRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
      <UiEmpty size="sm" v-else description="暂无纠错工单" />
    </UiCard>

    <UiDrawer v-model:open="rejectDrawerOpen" title="驳回纠错" width="420">
      <p v-if="rejectTarget" class="correction-admin__reject-meta">
        {{ formatPortfolioTeacherDisplay(rejectTarget.teacherName, rejectTarget.teacherNumber) }} ·
        {{ rejectTarget.fieldLabel ?? rejectTarget.fieldCode }}
      </p>
      <UiTextarea
        v-model="rejectForm.handleOpinion"
        size="sm"
        :rows="4"
        placeholder="请填写驳回意见"
      />
      <template #footer>
        <UiButton size="sm" variant="ghost" @click="resetRejectContext"> 取消 </UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="!!handlingId"
          @click="() => void submitReject()"
        >
          确认驳回
        </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer
      v-model:open="impactDrawerOpen"
      title="纠错影响报告"
      width="620"
      hide-footer
      @close="resetImpactContext"
    >
      <UiSpin :spinning="impactLoading">
        <template v-if="impactDetail">
          <div class="correction-admin__impact-head">
            <UiTag :tone="impactStatusTone(impactDetail.recomputeStatus)">
              {{ impactStatusLabel(impactDetail.recomputeStatus) }}
            </UiTag>
            <UiButton
              v-if="impactDetail.retryAllowed"
              size="sm"
              variant="primary"
              :loading="impactRecomputing"
              :disabled="operationPending && !impactRecomputing"
              @click="recomputeImpact"
            >
              {{
                impactDetail.recomputeStatus === PortfolioCorrectionImpactRecomputeStatusCode.FAILED
                  ? '重新重算'
                  : impactDetail.recomputeStatus
                    === PortfolioCorrectionImpactRecomputeStatusCode.RUNNING
                    ? '接管重试'
                    : '执行重算'
              }}
            </UiButton>
          </div>
          <p class="correction-admin__impact-summary">{{ impactDetail.impactSummary }}</p>
          <dl class="correction-admin__impact-grid">
            <dt>开始时间</dt>
            <dd>{{ impactDetail.recomputeStartedTime || '尚未开始' }}</dd>
            <dt>完成时间</dt>
            <dd>{{ impactDetail.recomputeTime || '尚未完成' }}</dd>
            <dt>受影响指标</dt>
            <dd>
              <div
                v-if="impactDetail.affectedIndicatorCodes.length"
                class="correction-admin__tag-list"
              >
                <UiTag v-for="code in impactDetail.affectedIndicatorCodes" :key="code" tone="blue">
                  {{ code }}
                </UiTag>
              </div>
              <span v-else>无</span>
            </dd>
            <dt>评价任务</dt>
            <dd>
              <div
                v-if="impactDetail.affectedEvaluationTaskIds.length"
                class="correction-admin__tag-list"
              >
                <UiTag v-for="id in impactDetail.affectedEvaluationTaskIds" :key="id" tone="gray">
                  {{ id }}
                </UiTag>
              </div>
              <span v-else>无</span>
            </dd>
          </dl>
          <p v-if="impactDetail.recomputeResult" class="correction-admin__impact-result">
            {{ impactDetail.recomputeResult }}
          </p>
          <p v-if="impactDetail.failureReason" class="correction-admin__impact-failure">
            {{ impactDetail.failureReason }}
          </p>
        </template>
      </UiSpin>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.correction-admin__reject-meta {
  margin: 0 0 var(--dp-space-3);
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-secondary);
}

.correction-admin__impact-head,
.correction-admin__tag-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
}

.correction-admin__impact-head {
  justify-content: space-between;
}

.correction-admin__impact-summary,
.correction-admin__impact-result,
.correction-admin__impact-failure {
  margin: var(--dp-space-3) 0 0;
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  font-size: var(--dp-font-size-md);
  overflow-wrap: anywhere;
}

.correction-admin__impact-result {
  border-color: var(--dp-success-border);
  background: var(--dp-success-bg);
}

.correction-admin__impact-failure {
  border-color: var(--dp-error-border);
  background: var(--dp-error-bg);
  color: var(--dp-error);
}

.correction-admin__impact-grid {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: var(--dp-space-2) var(--dp-space-3);
  margin: var(--dp-space-4) 0 0;
  font-size: var(--dp-font-size-sm);
}

.correction-admin__impact-grid dt {
  color: var(--dp-text-secondary);
}

.correction-admin__impact-grid dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
