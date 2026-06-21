<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <MarkExamSelect
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
          <UiTag v-if="selectedExamId" tone="green" size="sm">
            日志 {{ logPagination.total }} · 事件 {{ incidents.length }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <!-- 主工作面 -->
    <UiEmpty
      v-if="!selectedExamId"
      description="请选择考试"
      class="audit-trail__empty"
    />

    <UiCard v-else class="detail-table-card audit-trail-page__main-card">
      <template #title>
        <FileSearchOutlined />
        <span>审计内容</span>
      </template>
      <template #extra>
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

      <a-tabs v-model:active-key="activeTab" class="audit-tabs" @change="onTabChange">
        <!-- 审计日志 -->
        <a-tab-pane key="logs" tab="审计日志">
          <UiFilterBar
            v-model="logFilter"
            :fields="logFilterFields"
            search-text="查询"
            @search="searchLogs"
          />

          <UiErrorRetryPanel
            v-if="logsLoadError"
            :error="logsLoadError"
            @retry="searchLogs"
          />

          <UiDataTable
            v-else
            :columns="logColumns"
            :data-source="operationLogs"
            :loading="logLoading"
            row-key="id"
            size="middle"
            class="audit-table student-detail-table__data-table"
            v-model:current="logPagination.current"
            v-model:page-size="logPagination.pageSize"
            :total="logPagination.total"
            flat
            @page-change="handleLogPageChange"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'operationType'">
                <UiTag tone="blue" size="sm">
                  {{ operationTypeText(operationLogs[index].operationType) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'targetType'">
                <span>
                  {{ targetTypeText(operationLogs[index].targetType) }}
                </span>
              </template>
              <template v-else-if="column.key === 'targetLabel'">
                <a-tooltip :title="operationLogs[index].targetLabel">
                  <span>{{ operationLogs[index].targetLabel }}</span>
                </a-tooltip>
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ formatDateTimeWithSeconds(operationLogs[index].createTime) }}
              </template>
              <template v-else-if="column.key === 'reason'">
                <a-tooltip :title="operationLogs[index].reason">
                  <span>{{ operationLogs[index].reason }}</span>
                </a-tooltip>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>

        <!-- 重大事件 -->
        <a-tab-pane key="incidents" tab="重大事件">
          <UiFilterBar
            v-model="incidentFilter"
            :fields="incidentFilterFields"
            search-text="查询"
            @search="loadIncidents"
          >
            <template #field-unresolvedOnly="{ update }">
              <a-checkbox
                :checked="Boolean(incidentFilter.unresolvedOnly)"
                @update:checked="(checked: boolean) => update(checked)"
              >
                仅未解决
              </a-checkbox>
            </template>
          </UiFilterBar>

          <UiErrorRetryPanel
            v-if="incidentsLoadError"
            :error="incidentsLoadError"
            @retry="loadIncidents"
          />

          <UiDataTable
            v-else
            pagination-mode="client"
            :columns="incidentColumns"
            :data-source="incidents"
            :loading="incidentLoading"
            row-key="id"
            size="middle"
            class="audit-table student-detail-table__data-table"
            :page-size="20"
            :total="incidents.length"
            flat
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
                <a-typography-paragraph
                  v-if="incidents[index].detail"
                  :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
                >
                  {{ incidents[index].detail }}
                </a-typography-paragraph>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction
                    v-if="!incidents[index].resolved"
                    tone="primary"
                    @click="openResolveModal(incidents[index])"
                  >
                    解决事件
                  </UiTextAction>
                  <span v-else class="muted">-</span>
                </div>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>

        <!-- 异常留痕样本 -->
        <a-tab-pane key="diagnostic-samples" tab="异常留痕样本">
          <UiFilterBar
            v-model="sampleFilter"
            :fields="sampleFilterFields"
            search-text="查询"
            @search="searchDiagnosticSamples"
          />

          <UiErrorRetryPanel
            v-if="samplesLoadError"
            :error="samplesLoadError"
            @retry="searchDiagnosticSamples"
          />

          <UiDataTable
            v-else
            :columns="sampleColumns"
            :data-source="diagnosticSamples"
            :loading="sampleLoading"
            row-key="id"
            size="middle"
            class="audit-table student-detail-table__data-table"
            v-model:current="samplePagination.current"
            v-model:page-size="samplePagination.pageSize"
            :total="samplePagination.total"
            flat
            @page-change="handleSamplePageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'sampleType'">
                <UiTag tone="purple" size="sm">
                  {{
                    strictEnumLabel(
                      DIAGNOSTIC_SAMPLE_TYPE_LABEL,
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
                <a-typography-paragraph
                  v-if="record.diagnostic"
                  :ellipsis="{ rows: 2, expandable: true, symbol: '展开' }"
                >
                  {{ record.diagnostic }}
                </a-typography-paragraph>
                <span v-else class="muted">-</span>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
    </UiCard>

    <!-- 解决事件弹窗 -->
    <a-modal
      v-model:open="resolveModalOpen"
      title="解决重大事件"
      :confirm-loading="resolving"
      ok-text="提交"
      cancel-text="取消"
      :width="560"
      @ok="submitResolve"
    >
      <a-form layout="vertical">
        <a-form-item label="事件摘要">
          <span>{{ resolvingIncident?.summary }}</span>
        </a-form-item>
        <a-form-item label="处置说明" required>
          <a-textarea
            v-model:value="resolveNote"
            :rows="4"
            placeholder="请说明事件处置过程与结论（5-500 字）"
            :maxlength="500"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { TablePaginationConfig } from 'ant-design-vue/es/table'
import type {
  AuditTargetTypeCode,
  DiagnosticSampleTypeCode,
  DiagnosticSampleVO,
  OperationLogVO,
  OperationTypeCode,
} from '@/apis/mark/admin-audit'
import type { IncidentLevelCode, IncidentRecordVO } from '@/apis/mark/admin-dashboard'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  AUDIT_TARGET_TYPE_LABEL,
  DIAGNOSTIC_SAMPLE_TYPE_LABEL,
  DIAGNOSTIC_SAMPLE_TYPE_OPTIONS,
  listDiagnosticSamples,
  listIncidents,
  listOperationLogs,
  OPERATION_TYPE_LABEL,
  OPERATION_TYPE_OPTIONS,
  resolveIncident,
} from '@/apis/mark/admin-audit'
import { INCIDENT_LEVEL_LABEL, INCIDENT_LEVEL_TONE } from '@/apis/mark/admin-dashboard'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiErrorRetryPanel from '@/components/ui-guide/ui/UiErrorRetryPanel.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { captureLoadFailure, showUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminAuditTrail' })

const route = useRoute()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  init: initExams,
  onExamChange: onSelectorChange,
  onExamSearch,
  searching,
  resolvingPinned,
} = useMarkExamSelector()

const activeTab = ref<'logs' | 'incidents' | 'diagnostic-samples'>('logs')

// ─── 审计日志 ──────────────────────────────────
const logLoading = ref(false)
const logsLoadError = ref<Error | null>(null)
const operationLogs = ref<OperationLogVO[]>([])
const logFilter = reactive<{ operationType?: OperationTypeCode }>({})
const logPagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
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
  logsLoadError.value = null
  try {
    const page = await listOperationLogs({
      examId: selectedExamId.value,
      operationType: logFilter.operationType,
      pageNum: logPagination.current ?? 1,
      pageSize: logPagination.pageSize ?? 20,
    })
    operationLogs.value = readPageList(page, '审计日志加载失败，请稍后重试')
    logPagination.current = page.pageNum
    logPagination.pageSize = page.pageSize
    logPagination.total = readPageTotal(page, '审计日志加载失败，请稍后重试')
  } catch (error) {
    logsLoadError.value = captureLoadFailure(error, '审计日志加载失败')
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
const incidentsLoadError = ref<Error | null>(null)
const incidents = ref<IncidentRecordVO[]>([])
const incidentFilter = reactive({ unresolvedOnly: false })

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

const incidentColumns = [
  { title: '级别', key: 'incidentLevel', dataIndex: 'incidentLevel', width: 90 },
  { title: '类型', key: 'incidentType', dataIndex: 'incidentType', width: 140 },
  { title: '摘要', key: 'summary', dataIndex: 'summary', ellipsis: true },
  { title: '详情', key: 'detail', dataIndex: 'detail', ellipsis: true },
  { title: '状态', key: 'resolved', dataIndex: 'resolved', width: 100 },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
  { title: '解决时间', key: 'resolvedTime', dataIndex: 'resolvedTime', width: 170 },
  { title: '操作', key: 'actions', fixed: 'right' as const, width: 110 },
]

async function loadIncidents() {
  const examId = selectedExamId.value
  if (!examId) return
  incidentLoading.value = true
  incidentsLoadError.value = null
  try {
    incidents.value = await readAllPages(
      (pageNum) => listIncidents({
        examId,
        unresolvedOnly: incidentFilter.unresolvedOnly,
        pageNum,
        pageSize: 100,
      }),
      '重大事件加载失败，请稍后重试',
    )
  } catch (error) {
    incidentsLoadError.value = captureLoadFailure(error, '重大事件加载失败')
    showUserError(error, '重大事件加载失败')
  } finally {
    incidentLoading.value = false
  }
}

// ─── 解决重大事件弹窗 ──────────────────────────────────
const resolveModalOpen = ref(false)
const resolving = ref(false)
const resolvingIncident = ref<IncidentRecordVO | null>(null)
const resolveNote = ref('')

function openResolveModal(incident: IncidentRecordVO) {
  resolvingIncident.value = incident
  resolveNote.value = ''
  resolveModalOpen.value = true
}

async function submitResolve() {
  if (!resolvingIncident.value) return
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
const samplesLoadError = ref<Error | null>(null)
const diagnosticSamples = ref<DiagnosticSampleVO[]>([])
const sampleFilter = reactive<{ sampleType?: DiagnosticSampleTypeCode }>({})
const samplePagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
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
  samplesLoadError.value = null
  try {
    const page = await listDiagnosticSamples({
      examId,
      sampleType: sampleFilter.sampleType,
      pageNum: samplePagination.current ?? 1,
      pageSize: samplePagination.pageSize ?? 20,
    })
    diagnosticSamples.value = readPageList(page, '异常留痕样本加载失败，请稍后重试')
    samplePagination.current = page.pageNum
    samplePagination.pageSize = page.pageSize
    samplePagination.total = readPageTotal(page, '异常留痕样本加载失败，请稍后重试')
  } catch (error) {
    samplesLoadError.value = captureLoadFailure(error, '异常留痕样本加载失败')
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

function onTabChange(_key: string | number) {
  if (!selectedExamId.value) return
  if (activeTab.value === 'logs' && operationLogs.value.length === 0) {
    loadLogs()
  } else if (activeTab.value === 'incidents' && incidents.value.length === 0) {
    loadIncidents()
  } else if (activeTab.value === 'diagnostic-samples' && diagnosticSamples.value.length === 0) {
    loadDiagnosticSamples()
  }
}

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
  return strictEnumLabel(OPERATION_TYPE_LABEL, code, '审计操作类型')
}

function targetTypeText(code: AuditTargetTypeCode): string {
  return strictEnumLabel(AUDIT_TARGET_TYPE_LABEL, code, '审计目标类型')
}

function incidentLevelTone(level: IncidentLevelCode): BadgeTone {
  return strictEnumTone(INCIDENT_LEVEL_TONE, level, '重大事件级别')
}

function incidentLevelLabel(level: IncidentLevelCode): string {
  return strictEnumLabel(INCIDENT_LEVEL_LABEL, level, '重大事件级别')
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
.audit-trail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
}

.audit-tabs {
  margin-top: 4px;
}

.filter-bar {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: var(--ant-color-fill-quaternary);
  border-radius: var(--dp-radius-md, 6px);
}

.audit-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.audit-trail {
  &__exam-select {
    width: 280px;
  }

  &__filter-input {
    width: 220px;
  }

  &__empty {
    padding: 48px 0;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
  }
}
</style>
