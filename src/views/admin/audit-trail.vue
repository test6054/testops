<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="isJourneyChrome ? contextBarTitle : '审计追踪'"
        :subtitle="isJourneyChrome ? contextBarSubtitle : '质控审计'"
      >
        <template #status>
          <UiTag v-if="isJourneyChrome && examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <MarkExamSelect
            v-if="!isExamWorkspaceRoute"
            :selected-exam-id="selectedExamId"
            :exam-options="examOptions"
            :loading="examLoading"
            :searching="searching"
            :resolving-pinned="resolvingPinned"
            select-class="audit-trail__exam-select"
            placeholder="选择考试"
            @change="onExamChange"
            @search="onExamSearch"
          />
          <UiTag tone="blue" size="sm">考试维度</UiTag>
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="reloadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" class="audit-trail__empty" />

    <template v-if="selectedExamId" #signal>
      <SignalBand compact variant="panel" :metrics="auditSignalMetrics" />
    </template>

    <ExamWorkspaceJourneySubNav v-if="selectedExamId && isExamWorkspaceRoute" />

    <WorkbenchSurfaceCard v-if="selectedExamId" flush class="audit-trail__surface">
      <template #head>
        <UiSectionTabs v-model="activeTab" :items="auditTabItems" compact divided />
      </template>

      <template v-if="activeTab === 'logs'">
        <UiFilterBar
          v-model="logFilter"
          :fields="logFilterFields"
          search-text="查询"
          @search="searchLogs"
        />

        <UiDataTable
          :columns="logColumns"
          :data-source="operationLogs"
          :loading="logLoading"
          row-key="id"
          size="middle"
          class="audit-table"
          v-model:current="logPagination.current"
          v-model:page-size="logPagination.pageSize"
          :total="logPagination.total"
          flat
          @page-change="handleLogPageChange"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'operationType'">
              <UiTag
                :tone="
                  strictEnumTone(
                    OPERATION_TYPE_TONE,
                    operationLogs[index].operationType,
                    '审计操作类型',
                  )
                "
                size="sm"
              >
                {{ operationTypeText(operationLogs[index].operationType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'targetType'">
              <span>
                {{ targetTypeText(operationLogs[index].targetType) }}
              </span>
            </template>
            <template v-else-if="column.key === 'targetLabel'">
              <UiTooltip :title="operationLogs[index].targetLabel" popup-mount="body">
                <span>{{ operationLogs[index].targetLabel }}</span>
              </UiTooltip>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatDateTimeWithSeconds(operationLogs[index].createTime) }}
            </template>
            <template v-else-if="column.key === 'reason'">
              <UiTooltip :title="operationLogs[index].reason" popup-mount="body">
                <span>{{ operationLogs[index].reason }}</span>
              </UiTooltip>
            </template>
          </template>
        </UiDataTable>
      </template>

      <template v-else-if="activeTab === 'incidents'">
        <UiFilterBar
          v-model="incidentFilter"
          :fields="incidentFilterFields"
          search-text="查询"
          @search="searchIncidents"
        >
          <template #field-unresolvedOnly="{ update }">
            <UiCheckbox
              :checked="Boolean(incidentFilter.unresolvedOnly)"
              @update:checked="(checked: boolean) => update(checked)"
            >
              仅未解决
            </UiCheckbox>
          </template>
        </UiFilterBar>

        <UiDataTable
          pagination-mode="server"
          :columns="incidentColumns"
          :data-source="incidents"
          :loading="incidentLoading"
          row-key="id"
          size="middle"
          class="audit-table"
          v-model:current="incidentPagination.current"
          v-model:page-size="incidentPagination.pageSize"
          :total="incidentPagination.total"
          flat
          @page-change="handleIncidentPageChange"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'incidentLevel'">
              <UiTag
                v-if="incidents[index].incidentLevel"
                :tone="incidentLevelTone(incidents[index].incidentLevel)"
                size="sm"
              >
                {{ incidentLevelLabel(incidents[index].incidentLevel) }}
              </UiTag>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'incidentType'">
              <span v-if="incidents[index].incidentType">
                {{ incidentTypeLabel(incidents[index].incidentType) }}
              </span>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'resolved'">
              <UiTag :tone="incidents[index].resolved ? 'green' : 'orange'" size="sm">
                {{ incidents[index].resolved ? '已解决' : '未解决' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatDateTimeWithSeconds(incidents[index].createTime) }}
            </template>
            <template v-else-if="column.key === 'resolvedTime'">
              {{ formatDateTimeWithSeconds(incidents[index].resolvedTime) }}
            </template>
            <template v-else-if="column.key === 'detail'">
              <UiTypographyParagraph
                v-if="incidents[index].detail"
                :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
              >
                {{ incidents[index].detail }}
              </UiTypographyParagraph>
              <span v-else class="muted">-</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                v-if="!incidents[index].resolved"
                :items="buildIncidentActions(incidents[index])"
                split
                @action="(key) => handleIncidentAction(key, incidents[index])"
              />
              <span v-else class="muted">-</span>
            </template>
          </template>
        </UiDataTable>
      </template>

      <template v-else-if="activeTab === 'diagnostic-samples'">
        <UiFilterBar
          v-model="sampleFilter"
          :fields="sampleFilterFields"
          search-text="查询"
          @search="searchDiagnosticSamples"
        />

        <UiDataTable
          :columns="sampleColumns"
          :data-source="diagnosticSamples"
          :loading="sampleLoading"
          row-key="id"
          size="middle"
          class="audit-table"
          v-model:current="samplePagination.current"
          v-model:page-size="samplePagination.pageSize"
          :total="samplePagination.total"
          flat
          @page-change="handleSamplePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'sampleType'">
              <UiTag
                :tone="
                  strictEnumTone(DIAGNOSTIC_SAMPLE_TYPE_TONE, record.sampleType, '异常留痕样本类型')
                "
                size="sm"
              >
                {{
                  strictEnumLabel(
                    DiagnosticSampleTypeDescription,
                    record.sampleType,
                    '异常留痕样本类型',
                  )
                }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatDateTimeWithSeconds(record.createTime) }}
            </template>
            <template v-else-if="column.key === 'diagnostic'">
              <UiTypographyParagraph
                v-if="record.diagnostic"
                :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
              >
                {{ record.diagnostic }}
              </UiTypographyParagraph>
              <span v-else class="muted">-</span>
            </template>
          </template>
        </UiDataTable>
      </template>
    </WorkbenchSurfaceCard>

    <!-- 解决事件弹窗 -->
    <UiDialog
      v-model:open="resolveModalOpen"
      title="解决重大事件"
      :confirm-loading="resolving"
      ok-text="提交"
      cancel-text="取消"
      :width="560"
      @ok="submitResolve"
    >
      <UiForm layout="vertical">
        <UiFormItem label="事件摘要">
          <span>{{ resolvingIncident?.summary }}</span>
        </UiFormItem>
        <UiFormItem label="处置说明" required>
          <UiTextarea
            size="sm"
            v-model="resolveNote"
            :rows="4"
            placeholder="请说明事件处置过程与结论（5-500 字）"
            :maxlength="500"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type {
  AuditTargetTypeCode,
  DiagnosticSampleResponse,
  DiagnosticSampleTypeCode,
  OperationLogResponse,
  OperationTypeCode,
} from '@/apis/mark/admin-audit'
import type {
  ExamIncidentRecord,
  IncidentLevelCode,
  IncidentTypeCode,
} from '@/apis/mark/incident-record'
import type {
  BadgeTone,
  FilterField,
  UiSectionTabItem,
  UiTableRowActionItem,
} from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  AuditTargetTypeDescription,
  DIAGNOSTIC_SAMPLE_TYPE_OPTIONS,
  DIAGNOSTIC_SAMPLE_TYPE_TONE,
  DiagnosticSampleTypeDescription,
  listDiagnosticSamples,
  listIncidents,
  listOperationLogs,
  OPERATION_TYPE_OPTIONS,
  OPERATION_TYPE_TONE,
  OperationTypeDescription,
  resolveIncident,
} from '@/apis/mark/admin-audit'
import {
  INCIDENT_LEVEL_TONE,
  IncidentLevelDescription,
  IncidentTypeDescription,
} from '@/apis/mark/incident-record'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import UiTypographyParagraph from '@/components/ui-guide/ui/UiTypographyParagraph.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useOptionalExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminAuditTrail' })

const route = useRoute()
const isExamWorkspaceRoute = computed(() => route.meta.layout === 'ExamWorkspace')

const { isJourneyChrome, contextBarTitle, contextBarSubtitle, examStatusLabel, examStatusTone }
  = useOptionalExamJourneyContextBar('质控审计')

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExam,
  init: initExams,
  onExamChange: onSelectorChange,
  onExamSearch,
  searching,
  resolvingPinned,
} = useMarkExamContext()

const activeTab = ref<'logs' | 'incidents' | 'diagnostic-samples'>('logs')

const unresolvedIncidentTotal = ref(0)

const unresolvedIncidentCount = computed(() => unresolvedIncidentTotal.value)

const auditTabItems = computed((): UiSectionTabItem[] => [
  {
    key: 'logs',
    label: '审计日志',
    count: logPagination.total || undefined,
  },
  {
    key: 'incidents',
    label: '重大事件',
    count: incidentPagination.total || undefined,
    badgeTone: unresolvedIncidentCount.value > 0 ? 'orange' : undefined,
  },
  {
    key: 'diagnostic-samples',
    label: '异常留痕样本',
    count: samplePagination.total || undefined,
  },
])

const auditSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'logs',
    label: '审计日志',
    value: logPagination.total ?? 0,
    unit: '条',
    tone: 'blue',
  },
  {
    key: 'incidents',
    label: '重大事件',
    value: incidentPagination.total ?? 0,
    unit: '条',
    tone: unresolvedIncidentCount.value > 0 ? 'orange' : 'gray',
  },
  {
    key: 'unresolved',
    label: '未解决',
    value: unresolvedIncidentCount.value,
    unit: '条',
    tone: unresolvedIncidentCount.value > 0 ? 'orange' : 'green',
  },
  {
    key: 'samples',
    label: '留痕样本',
    value: samplePagination.total ?? 0,
    unit: '条',
    tone: 'blue',
  },
])

// ─── 审计日志 ──────────────────────────────────
const logLoading = ref(false)
const operationLogs = ref<OperationLogResponse[]>([])
const logFilter = reactive<{ operationType?: OperationTypeCode }>({})
const logPagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})
const operationTypeOptions = computed<Array<{ value: OperationTypeCode, label: string }>>(
  () => OPERATION_TYPE_OPTIONS,
)

const logFilterFields = computed<FilterField[]>(() => [
  {
    key: 'operationType',
    type: 'select',
    placeholder: '全部类型',
    allowClear: true,
    allowSearch: true,
    width: 200,
    options: operationTypeOptions.value.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  },
])

const logColumns = [
  { title: '操作类型', key: 'operationType', dataIndex: 'operationType', width: 160 },
  { title: '目标类型', key: 'targetType', dataIndex: 'targetType', width: 130 },
  { title: '目标对象', key: 'targetLabel', dataIndex: 'targetLabel', width: 220, ellipsis: true },
  { title: '操作人', key: 'operatorName', dataIndex: 'operatorName', width: 120 },
  { title: '原因', key: 'reason', dataIndex: 'reason', width: 200, ellipsis: true },
  { title: '时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
]

async function loadLogs() {
  if (!selectedExamId.value) return
  logLoading.value = true
  try {
    const page = await listOperationLogs({
      examId: selectedExamId.value,
      operationType: logFilter.operationType,
      pageNum: logPagination.current ?? 1,
      pageSize: logPagination.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
    })
    operationLogs.value = page.list
    logPagination.current = page.pageNum
    logPagination.pageSize = page.pageSize
    logPagination.total = page.total
  } catch (error) {
    operationLogs.value = []
    logPagination.total = 0
    showUserError(error, '审计日志加载失败')
  } finally {
    logLoading.value = false
  }
}

function searchLogs() {
  logPagination.current = 1
  void loadLogs()
}

function handleLogPageChange(pageInfo: { current: number, pageSize: number }) {
  logPagination.current = pageInfo.current
  logPagination.pageSize = pageInfo.pageSize
  void loadLogs()
}

// ─── 重大事件 ──────────────────────────────────
const incidentLoading = ref(false)
const incidents = ref<ExamIncidentRecord[]>([])
/** MVR-288：默认拒绝假可写；详情/列表能力位同源 hasExamReviewerWritePermission */
const canManageReviewerWrites = computed(() => {
  if (selectedExam.value?.canManageReviewerWrites === true) {
    return true
  }
  return incidents.value.some(item => item.canManageReviewerWrites === true)
})
const incidentFilter = reactive({ unresolvedOnly: false })
const incidentPagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const incidentFilterFields: FilterField[] = [
  {
    key: 'unresolvedOnly',
    type: 'custom',
    width: 140,
    minWidth: 140,
    maxWidth: 180,
    defaultValue: false,
    triggerSearchOnChange: false,
  },
]

const incidentColumns: ColumnsType<ExamIncidentRecord> = [
  { title: '级别', key: 'incidentLevel', dataIndex: 'incidentLevel', width: 90, fixed: 'left' },
  { title: '类型', key: 'incidentType', dataIndex: 'incidentType', width: 140 },
  { title: '摘要', key: 'summary', dataIndex: 'summary', ellipsis: true },
  { title: '详情', key: 'detail', dataIndex: 'detail', ellipsis: true },
  { title: '状态', key: 'resolved', dataIndex: 'resolved', width: 100 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '解决时间', key: 'resolvedTime', dataIndex: 'resolvedTime', width: 170 },
  { title: '操作', key: 'actions', width: 110 },
]

async function loadIncidents() {
  const examId = selectedExamId.value
  if (!examId) return
  incidentLoading.value = true
  try {
    const page = await listIncidents({
      examId,
      unresolvedOnly: incidentFilter.unresolvedOnly,
      pageNum: incidentPagination.current ?? 1,
      pageSize: incidentPagination.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
    })
    incidents.value = page.list
    incidentPagination.current = page.pageNum
    incidentPagination.pageSize = page.pageSize
    incidentPagination.total = page.total
    const unresolvedPage = await listIncidents({
      examId,
      unresolvedOnly: true,
      pageNum: 1,
      pageSize: 1,
    })
    unresolvedIncidentTotal.value = unresolvedPage.total
  } catch (error) {
    incidents.value = []
    incidentPagination.total = 0
    unresolvedIncidentTotal.value = 0
    showUserError(error, '重大事件加载失败')
  } finally {
    incidentLoading.value = false
  }
}

function searchIncidents() {
  incidentPagination.current = 1
  void loadIncidents()
}

function handleIncidentPageChange(pageInfo: { current: number, pageSize: number }): void {
  incidentPagination.current = pageInfo.current
  incidentPagination.pageSize = pageInfo.pageSize
  void loadIncidents()
}

// ─── 解决重大事件弹窗 ──────────────────────────────────
const resolveModalOpen = ref(false)
const resolving = ref(false)
const resolvingIncident = ref<ExamIncidentRecord | null>(null)
const resolveNote = ref('')

function buildIncidentActions(record: ExamIncidentRecord): UiTableRowActionItem[] {
  if (!canManageReviewerWrites.value) {
    return []
  }
  return [
    {
      key: 'resolve',
      label: '解决事件',
      tone: 'primary',
      hidden: record.resolved,
    },
  ]
}

function handleIncidentAction(key: string, record: ExamIncidentRecord): void {
  if (key === 'resolve') {
    openResolveModal(record)
  }
}

function openResolveModal(incident: ExamIncidentRecord) {
  if (!canManageReviewerWrites.value) {
    message.warning('仅本场阅卷组织成员、主考或管理员可处置重大事件')
    return
  }
  resolvingIncident.value = incident
  resolveNote.value = ''
  resolveModalOpen.value = true
}

async function submitResolve() {
  if (resolving.value || !resolvingIncident.value) return
  if (!canManageReviewerWrites.value) {
    message.warning('仅本场阅卷组织成员、主考或管理员可处置重大事件')
    return
  }
  const note = resolveNote.value.trim()
  if (note.length < 5) {
    message.warning('处置说明至少 5 个字')
    return
  }
  resolving.value = true
  try {
    await resolveIncident({
      incidentId: resolvingIncident.value.id,
      resolveNote: note,
    })
    message.success('事件已解决')
    resolveModalOpen.value = false
    await loadIncidents()
  } catch (error) {
    showUserError(error, '重大事件处置失败')
  } finally {
    resolving.value = false
  }
}

// ─── 异常留痕样本 ──────────────────────────────────
const sampleLoading = ref(false)
const diagnosticSamples = ref<DiagnosticSampleResponse[]>([])
const sampleFilter = reactive<{ sampleType?: DiagnosticSampleTypeCode }>({})
const samplePagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})
const diagnosticSampleTypeOptions = computed<
  Array<{ value: DiagnosticSampleTypeCode, label: string }>
>(() => DIAGNOSTIC_SAMPLE_TYPE_OPTIONS)

const sampleFilterFields = computed<FilterField[]>(() => [
  {
    key: 'sampleType',
    type: 'select',
    placeholder: '全部类型',
    allowClear: true,
    allowSearch: true,
    width: 200,
    options: diagnosticSampleTypeOptions.value.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  },
])

const sampleColumns = [
  { title: '样本类型', key: 'sampleType', dataIndex: 'sampleType', width: 160 },
  { title: '来源类型', key: 'sourceType', dataIndex: 'sourceType', width: 140 },
  { title: '处理说明', key: 'diagnostic', ellipsis: true },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
]

async function loadDiagnosticSamples() {
  const examId = selectedExamId.value
  if (!examId) return
  sampleLoading.value = true
  try {
    const page = await listDiagnosticSamples({
      examId,
      sampleType: sampleFilter.sampleType,
      pageNum: samplePagination.current ?? 1,
      pageSize: samplePagination.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
    })
    diagnosticSamples.value = page.list
    samplePagination.current = page.pageNum
    samplePagination.pageSize = page.pageSize
    samplePagination.total = page.total
  } catch (error) {
    diagnosticSamples.value = []
    samplePagination.total = 0
    showUserError(error, '异常留痕样本加载失败')
  } finally {
    sampleLoading.value = false
  }
}

function searchDiagnosticSamples() {
  samplePagination.current = 1
  void loadDiagnosticSamples()
}

function handleSamplePageChange(pageInfo: { current: number, pageSize: number }) {
  samplePagination.current = pageInfo.current
  samplePagination.pageSize = pageInfo.pageSize
  void loadDiagnosticSamples()
}

// ─── 整体编排 ──────────────────────────────────
const loading = computed(() => logLoading.value || incidentLoading.value || sampleLoading.value)

function reloadAll() {
  loadLogs()
  loadIncidents()
  loadDiagnosticSamples()
}

function onTabChange(): void {
  if (!selectedExamId.value) return
  if (activeTab.value === 'logs' && operationLogs.value.length === 0) {
    loadLogs()
  } else if (activeTab.value === 'incidents' && incidents.value.length === 0) {
    loadIncidents()
  } else if (activeTab.value === 'diagnostic-samples' && diagnosticSamples.value.length === 0) {
    loadDiagnosticSamples()
  }
}

watch(activeTab, () => {
  onTabChange()
})

function onExamChange(value: SelectValue) {
  onSelectorChange(value)
  operationLogs.value = []
  logPagination.current = 1
  logPagination.total = 0
  incidents.value = []
  diagnosticSamples.value = []
  samplePagination.current = 1
  samplePagination.total = 0
  if (selectedExamId.value) {
    reloadAll()
  }
}

// 严格 typed helper：模板侧用 operationLogs[index] / incidents[index] 取后端 VO，
// helper 把 OperationTypeCode/IncidentLevelCode 映射成 a-table 单元格需要的字符串/BadgeTone。
function operationTypeText(code: OperationTypeCode): string {
  return strictEnumLabel(OperationTypeDescription, code, '审计操作类型')
}

function targetTypeText(code: AuditTargetTypeCode): string {
  return strictEnumLabel(AuditTargetTypeDescription, code, '审计目标类型')
}

function incidentLevelTone(level: IncidentLevelCode): BadgeTone {
  return strictEnumTone(INCIDENT_LEVEL_TONE, level, '重大事件级别')
}

function incidentLevelLabel(level: IncidentLevelCode): string {
  return strictEnumLabel(IncidentLevelDescription, level, '重大事件级别')
}

function incidentTypeLabel(type: IncidentTypeCode): string {
  return strictEnumLabel(IncidentTypeDescription, type, '重大事件类型')
}

onMounted(async () => {
  await initExams()
  const tabQuery = route.query.tab
  if (tabQuery === 'incidents' || tabQuery === 'logs' || tabQuery === 'diagnostic-samples') {
    activeTab.value = tabQuery
  }
  if (route.query.unresolvedOnly === '1') {
    incidentFilter.unresolvedOnly = true
  }
  if (selectedExamId.value) {
    reloadAll()
  }
})

onActivated(() => {
  if (selectedExamId.value) {
    reloadAll()
  }
})
</script>

<style lang="scss" scoped>
.audit-trail {
  &__tabs {
    padding: 0 16px;
  }

  &__exam-select {
    width: 280px;
  }

  &__filter-input {
    width: 220px;
  }

  &__empty {
    padding: 20px 0;
  }

  &__hint {
    color: var(--dp-text-muted);
  }
}
</style>
