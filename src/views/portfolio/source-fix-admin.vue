<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioSourceFixBatchRequest,
  PortfolioSourceFixEventVO,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioSourceFixApi } from '@/apis/portfolio/source-fix'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  PORTFOLIO_SOURCE_FIX_ALERT_STATUS_LABEL,
  PortfolioSourceFixAlertStatusCode,
} from '@/types/enums/portfolio-source-fix-alert-status-enum'
import {
  PortfolioSourceFixDataSourceCode,
  PortfolioSourceFixDataSourceCodeDescription,
} from '@/types/enums/portfolio-source-fix-data-source-code-enum'
import {
  PORTFOLIO_SOURCE_FIX_EVENT_STATUS_LABEL,
  PortfolioSourceFixEventStatusCode,
} from '@/types/enums/portfolio-source-fix-event-status-enum'
import { PORTFOLIO_SOURCE_FIX_TRIGGER_SOURCE_LABEL } from '@/types/enums/portfolio-source-fix-trigger-source-enum'
import {
  PORTFOLIO_SOURCE_FIX_TRIGGER_TYPE_LABEL,
  PortfolioSourceFixTriggerTypeCode,
} from '@/types/enums/portfolio-source-fix-trigger-type-enum'
import { showUserError } from '@/utils/error-handler'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()

const loading = ref(false)
const acting = ref(false)
const requestToken = ref(0)
const rows = ref<PortfolioSourceFixEventVO[]>([])
const total = ref(0)
const detailOpen = ref(false)
const detail = ref<PortfolioSourceFixEventVO | null>(null)
const batchOpen = ref(false)

const filterForm = reactive({
  eventStatus: undefined as PortfolioSourceFixEventStatusCode | undefined,
  alertStatus: undefined as PortfolioSourceFixAlertStatusCode | undefined,
  triggerType: undefined as PortfolioSourceFixTriggerTypeCode | undefined,
})

const filterModel = computed({
  get: () => filterForm,
  set: (v) => Object.assign(filterForm, v),
})

const filterFields = computed(() => [
  {
    key: 'alertStatus',
    type: 'select' as const,
    label: '告警',
    allowClear: true,
    width: 140,
    options: Object.values(PortfolioSourceFixAlertStatusCode).map((c) => ({
      value: c,
      label: PORTFOLIO_SOURCE_FIX_ALERT_STATUS_LABEL[c],
    })),
  },
  {
    key: 'eventStatus',
    type: 'select' as const,
    label: '事件状态',
    allowClear: true,
    width: 140,
    options: Object.values(PortfolioSourceFixEventStatusCode).map((c) => ({
      value: c,
      label: PORTFOLIO_SOURCE_FIX_EVENT_STATUS_LABEL[c],
    })),
  },
  {
    key: 'triggerType',
    type: 'select' as const,
    label: '触发类型',
    allowClear: true,
    width: 160,
    options: Object.values(PortfolioSourceFixTriggerTypeCode).map((c) => ({
      value: c,
      label: PORTFOLIO_SOURCE_FIX_TRIGGER_TYPE_LABEL[c],
    })),
  },
])

const query = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })

const dataSourceCodeOptions = Object.values(PortfolioSourceFixDataSourceCode).map((value) => ({
  value,
  label: PortfolioSourceFixDataSourceCodeDescription[value],
}))

const batchForm = reactive({
  triggerReason: '',
  teacherIdsText: '',
  departmentOrgId: '',
  majorGroupOrgId: '',
  evaluationTaskId: '',
  beforeValue: '',
  afterValue: '',
  fieldCode: '',
  fieldLabel: '',
  dataSourceCode: undefined as PortfolioSourceFixDataSourceCode | undefined,
})

const columns: ColumnsType = [
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '触发', key: 'triggerType', width: 110 },
  { title: '原因', dataIndex: 'triggerReason', key: 'triggerReason', ellipsis: true },
  { title: '字段', dataIndex: 'fieldCode', key: 'fieldCode', width: 100, ellipsis: true },
  { title: '前值', dataIndex: 'beforeValue', key: 'beforeValue', width: 120, ellipsis: true },
  { title: '后值', dataIndex: 'afterValue', key: 'afterValue', width: 120, ellipsis: true },
  { title: '状态', key: 'eventStatus', width: 100 },
  { title: '告警', key: 'alertStatus', width: 90 },
  { title: '教师/指标/任务', key: 'counts', width: 140 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const itemColumns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 120 },
  { title: '状态', dataIndex: 'itemStatus', key: 'itemStatus', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 140 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '前值', dataIndex: 'beforeValue', key: 'beforeValue', ellipsis: true },
  { title: '后值', dataIndex: 'afterValue', key: 'afterValue', ellipsis: true },
  { title: '结果', dataIndex: 'recomputeResult', key: 'recomputeResult', ellipsis: true },
  { title: '失败原因', dataIndex: 'failureReason', key: 'failureReason', ellipsis: true },
]

function triggerLabel(code?: string) {
  if (!code) return '—'
  return PORTFOLIO_SOURCE_FIX_TRIGGER_TYPE_LABEL[code as PortfolioSourceFixTriggerTypeCode] || code
}

function statusLabel(code?: string) {
  if (!code) return '—'
  return PORTFOLIO_SOURCE_FIX_EVENT_STATUS_LABEL[code as PortfolioSourceFixEventStatusCode] || code
}

function alertLabel(code?: string) {
  if (!code) return '—'
  return PORTFOLIO_SOURCE_FIX_ALERT_STATUS_LABEL[code as PortfolioSourceFixAlertStatusCode] || code
}

function alertTone(code?: string) {
  if (code === PortfolioSourceFixAlertStatusCode.OPEN) return 'red' as const
  if (code === PortfolioSourceFixAlertStatusCode.ACKED) return 'orange' as const
  if (code === PortfolioSourceFixAlertStatusCode.NONE) return 'gray' as const
  return 'blue' as const
}

function statusTone(code?: string) {
  if (code === PortfolioSourceFixEventStatusCode.SUCCESS) return 'green' as const
  if (code === PortfolioSourceFixEventStatusCode.FAILED) return 'red' as const
  if (code === PortfolioSourceFixEventStatusCode.PARTIAL) return 'orange' as const
  if (code === PortfolioSourceFixEventStatusCode.RUNNING) return 'blue' as const
  return 'gray' as const
}

/** 明细行生命周期 Tag 色（US-MI：读模型仅标注，不默认过滤）。 */
function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

async function loadPage() {
  const currentToken = ++requestToken.value
  loading.value = true
  try {
    const result = await portfolioSourceFixApi.page({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      eventStatus: filterForm.eventStatus,
      alertStatus: filterForm.alertStatus,
      triggerType: filterForm.triggerType,
    })
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
  } catch (error) {
    if (requestToken.value !== currentToken) return
    rows.value = []
    total.value = 0
    showUserError(error, '加载源修复重算事件失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function readRouteStringParam(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

/**
 * PF-P0-285 / §8.52：源修复重算站内信 jumpUrl 携带 eventId 时打开对应事件详情。
 */
async function applyEventIdDeepLink() {
  const eventId = readRouteStringParam(route.query.eventId)
  if (!eventId) {
    return
  }
  const matched = rows.value.find((row) => String(row.id) === eventId)
  if (matched) {
    await openDetail(matched)
    return
  }
  await openDetail({ id: eventId } as PortfolioSourceFixEventVO)
}

async function openDetail(row: PortfolioSourceFixEventVO) {
  if (!row.id || acting.value) return
  acting.value = true
  try {
    detail.value = await portfolioSourceFixApi.get(row.id)
    detailOpen.value = true
  } catch (error) {
    showUserError(error, '加载事件详情失败')
  } finally {
    acting.value = false
  }
}

async function executeEvent(row: PortfolioSourceFixEventVO) {
  if (!row.id || acting.value) return
  acting.value = true
  try {
    await portfolioSourceFixApi.execute(row.id)
    void message.success('已触发重算')
    await loadPage()
    if (detailOpen.value && detail.value?.id === row.id) {
      detail.value = await portfolioSourceFixApi.get(row.id)
    }
  } catch (error) {
    showUserError(error, '执行重算失败')
  } finally {
    acting.value = false
  }
}

async function ackAlert(row: PortfolioSourceFixEventVO) {
  if (!row.id || acting.value) return
  if (row.alertStatus !== PortfolioSourceFixAlertStatusCode.OPEN) {
    void message.warning('仅 OPEN 告警可确认')
    return
  }
  acting.value = true
  try {
    await portfolioSourceFixApi.ackAlert(row.id)
    void message.success('告警已确认')
    await loadPage()
  } catch (error) {
    showUserError(error, '确认告警失败')
  } finally {
    acting.value = false
  }
}

async function submitBatch() {
  if (acting.value) return
  const reason = batchForm.triggerReason.trim()
  if (!reason) {
    void message.warning('请填写触发原因')
    return
  }
  const teacherIds = batchForm.teacherIdsText
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const payload: PortfolioSourceFixBatchRequest = {
    triggerReason: reason,
    beforeValue: batchForm.beforeValue.trim() || undefined,
    afterValue: batchForm.afterValue.trim() || undefined,
    fieldCode: batchForm.fieldCode.trim() || undefined,
    fieldLabel: batchForm.fieldLabel.trim() || undefined,
    dataSourceCode: batchForm.dataSourceCode,
    teacherIds: teacherIds.length ? teacherIds : undefined,
    departmentOrgId: batchForm.departmentOrgId.trim() || undefined,
    majorGroupOrgId: batchForm.majorGroupOrgId.trim() || undefined,
    evaluationTaskId: batchForm.evaluationTaskId.trim() || undefined,
  }
  acting.value = true
  try {
    const event = await portfolioSourceFixApi.batch(payload)
    void message.success(`批量重算已提交，事件 #${event.id ?? ''}`)
    batchOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '提交批量重算失败')
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  await loadPage()
  await applyEventIdDeepLink()
})

watch(
  () => route.query.eventId,
  (eventId, previousEventId) => {
    if (eventId === previousEventId) {
      return
    }
    if (typeof eventId === 'string' && eventId) {
      void applyEventIdDeepLink()
    }
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="源修复回流与批量重算" subtitle="§8.52 统一事件 · 失败告警 · 变更前后值" />

    <UiCard class="mb-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p class="m-0 text-sm text-[var(--dp-text-secondary)]">
          承接纠错关闭、源系统修复、导入回滚与管理端批量范围；失败进入 OPEN 告警，禁止静默。
        </p>
        <UiButton tone="primary" :disabled="acting" @click="batchOpen = true">批量重算</UiButton>
      </div>
      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        search-label="查询"
        @search="onSearch"
      />
    </UiCard>

    <UiCard>
      <UiDataTable
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          onChange: (page: number, pageSize: number) => {
            query.pageNum = page
            query.pageSize = pageSize
            void loadPage()
          },
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'triggerType'">
            {{ triggerLabel(record.triggerType) }}
          </template>
          <template v-else-if="column.key === 'eventStatus'">
            <UiTag :tone="statusTone(record.eventStatus)">
              {{
                statusLabel(record.eventStatus)
              }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'alertStatus'">
            <UiTag :tone="alertTone(record.alertStatus)">
              {{
                alertLabel(record.alertStatus)
              }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'counts'">
            {{ record.affectedTeacherCount ?? 0 }}/{{ record.affectedIndicatorCount ?? 0 }}/{{
              record.affectedEvaluationTaskCount ?? 0
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="flex flex-wrap gap-2">
              <UiButton size="sm" :disabled="acting" @click="openDetail(record)">详情</UiButton>
              <UiButton
                size="sm"
                tone="primary"
                :disabled="
                  acting
                    || record.eventStatus === PortfolioSourceFixEventStatusCode.SUCCESS
                    || record.eventStatus === PortfolioSourceFixEventStatusCode.RUNNING
                "
                @click="executeEvent(record)"
              >
                执行
              </UiButton>
              <UiButton
                size="sm"
                :disabled="acting || record.alertStatus !== PortfolioSourceFixAlertStatusCode.OPEN"
                @click="ackAlert(record)"
              >
                确认告警
              </UiButton>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <a-drawer v-model:open="detailOpen" title="源修复重算事件详情" width="720" destroy-on-close>
      <template v-if="detail">
        <div class="mb-4 space-y-2 text-sm">
          <div>触发：{{ triggerLabel(detail.triggerType) }} · {{ detail.triggerSource ? (PORTFOLIO_SOURCE_FIX_TRIGGER_SOURCE_LABEL[detail.triggerSource] ?? detail.triggerSource) : '-' }}</div>
          <div>原因：{{ detail.triggerReason }}</div>
          <div>
            字段：{{ detail.fieldLabel || detail.fieldCode || '—' }}（{{
              detail.fieldCode || '—'
            }}）
          </div>
          <div>变更：{{ detail.beforeValue || '空' }} → {{ detail.afterValue || '空' }}</div>
          <div v-if="detail.dataSourceCode">数据源：{{ detail.dataSourceCode ? PortfolioSourceFixDataSourceCodeDescription[detail.dataSourceCode] : '' }}</div>
          <div>
            状态：
            <UiTag :tone="statusTone(detail.eventStatus)">
              {{
                statusLabel(detail.eventStatus)
              }}
            </UiTag>
            告警：
            <UiTag :tone="alertTone(detail.alertStatus)">
              {{
                alertLabel(detail.alertStatus)
              }}
            </UiTag>
          </div>
          <div>影响摘要：{{ detail.impactSummary || '—' }}</div>
          <div>重算结果：{{ detail.recomputeResult || '—' }}</div>
          <div v-if="detail.failureReason" class="text-[var(--dp-danger)]">
            失败：{{ detail.failureReason }}
          </div>
        </div>
        <UiDataTable
          :columns="itemColumns"
          :data-source="detail.items ?? []"
          :pagination="false"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!record.lifecycleStatus">-</span>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
                :row-key="record.id || record.teacherId || record.teacherUserId || record.userId"
              />
            </template>
          </template>
        </UiDataTable>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="batchOpen"
      title="提交批量源修复重算"
      ok-text="提交并执行"
      :confirm-loading="acting"
      destroy-on-close
      @ok="submitBatch"
    >
      <div class="space-y-3">
        <a-textarea
          v-model:value="batchForm.triggerReason"
          :rows="2"
          placeholder="触发原因（必填）"
        />
        <a-input
          v-model:value="batchForm.teacherIdsText"
          placeholder="教师 ID 列表，逗号/空格分隔（可选）"
        />
        <a-input v-model:value="batchForm.departmentOrgId" placeholder="院系组织 ID（可选）" />
        <a-input v-model:value="batchForm.majorGroupOrgId" placeholder="专业群组织 ID（可选）" />
        <a-input v-model:value="batchForm.evaluationTaskId" placeholder="评价任务 ID（可选）" />
        <div class="grid grid-cols-2 gap-2">
          <a-input v-model:value="batchForm.beforeValue" placeholder="变更前值" />
          <a-input v-model:value="batchForm.afterValue" placeholder="变更后值" />
          <a-input v-model:value="batchForm.fieldCode" placeholder="字段编码" />
          <a-input v-model:value="batchForm.fieldLabel" placeholder="字段名称" />
        </div>
        <a-select
          v-model:value="batchForm.dataSourceCode"
          allow-clear
          placeholder="数据源编码"
          :options="dataSourceCodeOptions"
          style="width: 100%"
        />
      </div>
    </a-modal>
  </StageWorkbenchShell>
</template>
