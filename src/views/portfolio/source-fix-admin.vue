<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {PortfolioEvaluationTaskVO} from '@/apis/portfolio/teacher-platform';
import type {
  PortfolioOrgTreeNodeVO,
  PortfolioSourceFixBatchPreviewVO,
  PortfolioSourceFixBatchRequest,
  PortfolioSourceFixEventVO,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioSourceFixApi } from '@/apis/portfolio/source-fix'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  portfolioEvaluationTaskApi
  
} from '@/apis/portfolio/teacher-platform'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioOrgUnitTypeCode } from '@/types/enums/portfolio-org-unit-type-enum'
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
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { portfolioTeacherSelectOptionsFromSummaries } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const { loadTree, treeRoots, loadFailed: orgTreeLoadFailed } = usePortfolioOrgTree()

const loading = ref(false)
const listLoadError = ref(false)
const acting = ref(false)
const previewing = ref(false)
const requestToken = ref(0)
const rows = ref<PortfolioSourceFixEventVO[]>([])
const total = ref(0)
const detailOpen = ref(false)
const detail = ref<PortfolioSourceFixEventVO | null>(null)
const batchOpen = ref(false)
const batchPreview = ref<PortfolioSourceFixBatchPreviewVO | null>(null)
const lastBatchResult = ref<PortfolioSourceFixEventVO | null>(null)

const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const evaluationTasks = ref<PortfolioEvaluationTaskVO[]>([])
const teacherSearchToken = ref(0)
const taskSearchToken = ref(0)
let teacherSearchTimer: ReturnType<typeof setTimeout> | undefined

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
  teacherIds: [] as string[],
  departmentOrgId: undefined as string | undefined,
  majorGroupOrgId: undefined as string | undefined,
  evaluationTaskId: undefined as string | undefined,
  beforeValue: '',
  afterValue: '',
  fieldCode: '',
  fieldLabel: '',
  dataSourceCode: undefined as PortfolioSourceFixDataSourceCode | undefined,
})

const teacherSelectOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))
const evaluationTaskOptions = computed(() =>
  evaluationTasks.value.map((task: PortfolioEvaluationTaskVO) => ({
    value: task.id,
    label: task.taskName,
  })),
)

function walkOrgOptions(
  nodes: PortfolioOrgTreeNodeVO[],
  match: (node: PortfolioOrgTreeNodeVO) => boolean,
  prefix = '',
  result: Array<{ value: string, label: string }> = [],
): Array<{ value: string, label: string }> {
  for (const node of nodes) {
    const label = prefix ? `${prefix} / ${node.name}` : node.name
    if (match(node) && node.portfolioOrgId) {
      result.push({ value: node.portfolioOrgId, label })
    }
    if (node.children?.length) {
      walkOrgOptions(node.children, match, label, result)
    }
  }
  return result
}

const majorGroupOptions = computed(() =>
  walkOrgOptions(
    treeRoots.value,
    (node) => node.nodeType === PortfolioOrgUnitTypeCode.MAJOR_GROUP,
  ),
)

const departmentOrgOptions = computed(() =>
  walkOrgOptions(
    treeRoots.value,
    (node) => node.nodeType === PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE,
  ),
)

const columns: ColumnsType = [
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '触发', key: 'triggerType', width: 110 },
  { title: '原因', dataIndex: 'triggerReason', key: 'triggerReason', ellipsis: true },
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 120, ellipsis: true },
  { title: '变更', key: 'change', width: 160, ellipsis: true },
  { title: '状态', key: 'eventStatus', width: 100 },
  { title: '告警', key: 'alertStatus', width: 90 },
  { title: '影响规模', key: 'counts', width: 180 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const itemColumns: ColumnsType = [
  { title: '教师 ID', dataIndex: 'teacherId', key: 'teacherId', width: 120 },
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
  return strictEnumLabel(PORTFOLIO_SOURCE_FIX_TRIGGER_TYPE_LABEL, code as PortfolioSourceFixTriggerTypeCode, '源修复触发类型')
}

function statusLabel(code?: string) {
  if (!code) return '—'
  return strictEnumLabel(PORTFOLIO_SOURCE_FIX_EVENT_STATUS_LABEL, code as PortfolioSourceFixEventStatusCode, '源修复事件状态')
}

function alertLabel(code?: string) {
  if (!code) return '—'
  return strictEnumLabel(PORTFOLIO_SOURCE_FIX_ALERT_STATUS_LABEL, code as PortfolioSourceFixAlertStatusCode, '源修复告警状态')
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

function impactCountsText(row: PortfolioSourceFixEventVO): string {
  const teacher = row.affectedTeacherCount
  const indicator = row.affectedIndicatorCount
  const task = row.affectedEvaluationTaskCount
  if (teacher == null && indicator == null && task == null) {
    return '—'
  }
  return `教师 ${teacher ?? '—'} · 指标 ${indicator ?? '—'} · 任务 ${task ?? '—'}`
}

function buildBatchPayload(): PortfolioSourceFixBatchRequest {
  return {
    triggerReason: batchForm.triggerReason.trim(),
    beforeValue: batchForm.beforeValue.trim() || undefined,
    afterValue: batchForm.afterValue.trim() || undefined,
    fieldCode: batchForm.fieldCode.trim() || undefined,
    fieldLabel: batchForm.fieldLabel.trim() || undefined,
    dataSourceCode: batchForm.dataSourceCode,
    teacherIds: batchForm.teacherIds.length ? batchForm.teacherIds : undefined,
    departmentOrgId: batchForm.departmentOrgId || undefined,
    majorGroupOrgId: batchForm.majorGroupOrgId || undefined,
    evaluationTaskId: batchForm.evaluationTaskId || undefined,
  }
}

function hasBatchScopeSelected(): boolean {
  return Boolean(
    batchForm.teacherIds.length
    || batchForm.departmentOrgId
    || batchForm.majorGroupOrgId
    || batchForm.evaluationTaskId,
  )
}

function resetBatchForm() {
  batchForm.triggerReason = ''
  batchForm.teacherIds = []
  batchForm.departmentOrgId = undefined
  batchForm.majorGroupOrgId = undefined
  batchForm.evaluationTaskId = undefined
  batchForm.beforeValue = ''
  batchForm.afterValue = ''
  batchForm.fieldCode = ''
  batchForm.fieldLabel = ''
  batchForm.dataSourceCode = undefined
  batchPreview.value = null
  lastBatchResult.value = null
}

async function openBatchModal() {
  resetBatchForm()
  batchOpen.value = true
  await Promise.all([loadTeachers(), loadEvaluationTasks(), loadTree()])
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
    listLoadError.value = false
  } catch (error) {
    if (requestToken.value !== currentToken) return
    listLoadError.value = true
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
    const event = await portfolioSourceFixApi.execute(row.id)
    void message.success(`重算完成：${statusLabel(event.eventStatus)}`)
    lastBatchResult.value = event
    detail.value = event
    detailOpen.value = true
    const refreshed = await loadPageQuiet()
    if (!refreshed) {
      void message.warning('重算已完成，事件列表刷新失败；请以详情结果为准')
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
    showFormValidationMessage('仅待处理告警可确认')
    return
  }
  acting.value = true
  try {
    await portfolioSourceFixApi.ackAlert(row.id)
    void message.success('告警已确认')
    const refreshed = await loadPageQuiet()
    if (!refreshed) {
      void message.warning('告警已确认，事件列表刷新失败')
    }
  } catch (error) {
    showUserError(error, '确认告警失败')
  } finally {
    acting.value = false
  }
}

async function loadPageQuiet(): Promise<boolean> {
  try {
    await loadPage()
    return !listLoadError.value
  } catch {
    return false
  }
}

async function loadTeachers(keyword?: string) {
  const currentToken = ++teacherSearchToken.value
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: keyword?.trim() || undefined,
    })
    if (teacherSearchToken.value !== currentToken) return
    teachers.value = page.list ?? []
  } catch (error) {
    if (teacherSearchToken.value !== currentToken) return
    showUserError(error, '加载教师名册失败')
  }
}

function handleTeacherSearch(value: string) {
  if (teacherSearchTimer) clearTimeout(teacherSearchTimer)
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

async function loadEvaluationTasks() {
  const currentToken = ++taskSearchToken.value
  try {
    const page = await portfolioEvaluationTaskApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
    })
    if (taskSearchToken.value !== currentToken) return
    evaluationTasks.value = page.list ?? []
  } catch (error) {
    if (taskSearchToken.value !== currentToken) return
    showUserError(error, '加载评价任务失败')
  }
}

async function runBatchPreview() {
  if (!hasBatchScopeSelected()) {
    showFormValidationMessage('请至少选择教师、院系组织、专业群或评价任务之一')
    return
  }
  previewing.value = true
  batchPreview.value = null
  try {
    batchPreview.value = await portfolioSourceFixApi.previewBatch(buildBatchPayload())
  } catch (error) {
    showUserError(error, '预检批量重算范围失败')
  } finally {
    previewing.value = false
  }
}

async function submitBatch() {
  if (acting.value) return
  const reason = batchForm.triggerReason.trim()
  if (!reason) {
    showFormValidationMessage('请填写触发原因')
    return
  }
  if (!hasBatchScopeSelected()) {
    showFormValidationMessage('请至少选择教师、院系组织、专业群或评价任务之一')
    return
  }
  if (!batchPreview.value) {
    showFormValidationMessage('请先预检范围后再执行')
    return
  }
  if (batchPreview.value.blocked) {
    showFormValidationMessage(batchPreview.value.blockers?.[0] || '预检未通过，无法执行')
    return
  }
  const confirmed = await confirmAsync({
    title: '确认执行批量重算？',
    content: `${batchPreview.value.scopeSummary || ''}；预计约 ${batchPreview.value.estimatedSeconds ?? '—'} 秒。本操作同步执行，完成后将展示 SUCCESS/PARTIAL/FAILED。`,
    type: 'warning',
  })
  if (!confirmed) {
    return
  }
  acting.value = true
  try {
    const event = await portfolioSourceFixApi.batch({
      ...buildBatchPayload(),
      triggerReason: reason,
    })
    lastBatchResult.value = event
    batchOpen.value = false
    detail.value = event
    detailOpen.value = true
    void message.success(`批量重算已完成：${statusLabel(event.eventStatus)}`)
    const refreshed = await loadPageQuiet()
    if (!refreshed) {
      void message.warning('批量重算已完成，事件列表刷新失败；请以详情结果为准')
    }
  } catch (error) {
    showUserError(error, '执行批量重算失败')
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

watch(
  () => [
    batchForm.teacherIds.join(','),
    batchForm.departmentOrgId,
    batchForm.majorGroupOrgId,
    batchForm.evaluationTaskId,
  ],
  () => {
    batchPreview.value = null
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="源修复回流与批量重算" subtitle="统一事件 · 范围预检 · 同步结果可追踪" />

    <UiCard class="dp-mb-block">
      <div class="dp-mb-component flex flex-wrap items-center justify-between gap-2">
        <p class="dp-text-secondary-sm">
          承接纠错关闭、源系统修复、导入回滚与管理端批量范围；失败进入 OPEN 告警，禁止静默。
        </p>
        <UiButton tone="primary" :disabled="acting" @click="openBatchModal">批量重算</UiButton>
      </div>
      <UiAlertStrip
        v-if="listLoadError"
        tone="error"
        title="事件列表加载失败"
        class="dp-mb-component"
      />
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
        :load-error="listLoadError"
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
          <template v-else-if="column.key === 'change'">
            {{ record.beforeValue || '空' }} → {{ record.afterValue || '空' }}
          </template>
          <template v-else-if="column.key === 'eventStatus'">
            <UiTag :tone="statusTone(record.eventStatus)">
              {{ statusLabel(record.eventStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'alertStatus'">
            <UiTag :tone="alertTone(record.alertStatus)">
              {{ alertLabel(record.alertStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'counts'">
            {{ impactCountsText(record) }}
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

    <UiDrawer v-model:open="detailOpen" title="源修复重算事件详情" :width="720">
      <template v-if="detail">
        <div class="dp-mb-block dp-space dp-space--block dp-space--vertical dp-space--tight">
          <div>
            触发：{{ triggerLabel(detail.triggerType) }} ·
            {{
              detail.triggerSource
                ? strictEnumLabel(
                  PORTFOLIO_SOURCE_FIX_TRIGGER_SOURCE_LABEL,
                  detail.triggerSource,
                  '源修复触发来源',
                )
                : '—'
            }}
          </div>
          <div>原因：{{ detail.triggerReason }}</div>
          <div>
            字段：{{ detail.fieldLabel || detail.fieldCode || '—' }}（{{
              detail.fieldCode || '—'
            }}）
          </div>
          <div>变更：{{ detail.beforeValue || '空' }} → {{ detail.afterValue || '空' }}</div>
          <div v-if="detail.dataSourceCode">
            数据源：{{
              PortfolioSourceFixDataSourceCodeDescription[detail.dataSourceCode]
            }}
          </div>
          <div>
            状态：
            <UiTag :tone="statusTone(detail.eventStatus)">
              {{ statusLabel(detail.eventStatus) }}
            </UiTag>
            告警：
            <UiTag :tone="alertTone(detail.alertStatus)">
              {{ alertLabel(detail.alertStatus) }}
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
              <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record.lifecycleStatus)">
                {{ portfolioLifecycleStatusDisplay(record.lifecycleStatus) }}
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
    </UiDrawer>

    <UiDialog
      v-model:open="batchOpen"
      title="批量源修复重算"
      :ok-text="batchPreview && !batchPreview.blocked ? '确认执行' : '先预检'"
      :confirm-loading="acting || previewing"
      :closable="!acting"
      :mask-closable="!acting"
      @ok="batchPreview && !batchPreview.blocked ? submitBatch() : runBatchPreview()"
    >
      <UiAlertStrip
        v-if="orgTreeLoadFailed"
        tone="warning"
        size="sm"
        dense
        title="组织树加载失败"
        description="院系/专业群选择可能不完整；可仅用教师或评价任务范围。"
        class="dp-mb-component"
      />
      <UiForm layout="vertical">
        <UiFormItem label="触发原因" required>
          <UiTextarea
            v-model="batchForm.triggerReason"
            size="sm"
            :rows="2"
            placeholder="说明本次批量重算原因"
            :disabled="acting"
          />
        </UiFormItem>
        <UiFormItem label="教师">
          <UiSelect
            v-model="batchForm.teacherIds"
            size="sm"
            mode="multiple"
            allow-clear
            allow-search
            :options="teacherSelectOptions"
            placeholder="搜索并选择教师"
            :disabled="acting"
            :filter-option="false"
            @search="handleTeacherSearch"
          />
        </UiFormItem>
        <UiFormItem label="院系组织（教研室锚点）">
          <UiSelect
            v-model="batchForm.departmentOrgId"
            size="sm"
            allow-clear
            allow-search
            :options="departmentOrgOptions"
            placeholder="选择院系/教研室档案组织"
            :disabled="acting"
          />
        </UiFormItem>
        <UiFormItem label="专业群">
          <UiSelect
            v-model="batchForm.majorGroupOrgId"
            size="sm"
            allow-clear
            allow-search
            :options="majorGroupOptions"
            placeholder="选择专业群"
            :disabled="acting"
          />
        </UiFormItem>
        <UiFormItem label="评价任务">
          <UiSelect
            v-model="batchForm.evaluationTaskId"
            size="sm"
            allow-clear
            allow-search
            :options="evaluationTaskOptions"
            placeholder="选择评价任务"
            :disabled="acting"
          />
        </UiFormItem>
        <div class="grid grid-cols-2 gap-2">
          <UiFormItem label="变更前值">
            <UiInput v-model="batchForm.beforeValue" size="sm" :disabled="acting" />
          </UiFormItem>
          <UiFormItem label="变更后值">
            <UiInput v-model="batchForm.afterValue" size="sm" :disabled="acting" />
          </UiFormItem>
          <UiFormItem label="字段编码">
            <UiInput v-model="batchForm.fieldCode" size="sm" :disabled="acting" />
          </UiFormItem>
          <UiFormItem label="字段名称">
            <UiInput v-model="batchForm.fieldLabel" size="sm" :disabled="acting" />
          </UiFormItem>
        </div>
        <UiFormItem label="数据源">
          <UiSelect
            v-model="batchForm.dataSourceCode"
            size="sm"
            allow-clear
            :options="dataSourceCodeOptions"
            placeholder="数据源编码"
            :disabled="acting"
          />
        </UiFormItem>
      </UiForm>

      <UiAlertStrip
        v-if="batchPreview?.blocked"
        tone="error"
        title="预检未通过"
        :description="(batchPreview.blockers ?? []).join('；')"
        class="dp-mt-component"
      />
      <UiAlertStrip
        v-else-if="batchPreview"
        tone="info"
        title="范围预检"
        :description="`${batchPreview.scopeSummary || ''}；预计约 ${batchPreview.estimatedSeconds ?? '—'} 秒。${
          (batchPreview.warnings ?? []).length ? `警告：${(batchPreview.warnings ?? []).join('；')}` : ''
        }`"
        class="dp-mt-component"
      />
      <p
        v-if="batchPreview?.sampleTeacherIds?.length"
        class="dp-mt-tight dp-text-muted-xs"
      >
        样例教师 ID：{{ batchPreview.sampleTeacherIds.join('、') }}
      </p>
    </UiDialog>
  </StageWorkbenchShell>
</template>
