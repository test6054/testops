<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="audit-trail__context">
        <div class="audit-trail__context-info">
          <h2 class="audit-trail__title">阅卷交付 - 审计与事件</h2>
          <a-select
            v-model:value="selectedExamId"
            placeholder="选择考试"
            class="audit-trail__exam-select"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            @change="onExamChange"
          />
          <UiTag tone="blue" size="sm">考试维度</UiTag>
          <UiTag v-if="selectedExamId" tone="green" size="sm">
            日志 {{ operationLogs.length }} · 事件 {{ incidents.length }}
          </UiTag>
        </div>
        <div class="audit-trail__context-actions">
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
        </div>
      </div>
    </template>

    <!-- 主工作面 -->
    <UiEmpty
      v-if="!selectedExamId"
      description="请先选择考试后查看审计数据"
      class="audit-trail__empty"
    />

    <UiCard v-else class="audit-trail-page__main-card">
      <template #title>
        <FileSearchOutlined />
        <span>审计内容</span>
        <UiBadge tone="blue">
          {{
            activeTab === 'logs'
              ? '审计日志'
              : activeTab === 'incidents'
                ? '重大事件'
                : '异常留痕样本'
          }}
        </UiBadge>
      </template>

      <a-tabs v-model:active-key="activeTab" class="audit-tabs" @change="onTabChange">
        <!-- 审计日志 -->
        <a-tab-pane key="logs" tab="审计日志">
          <div class="filter-bar">
            <a-space wrap>
              <a-select
                v-model:value="logFilter.operationType"
                placeholder="操作类型"
                allow-clear
                class="audit-trail__filter-input"
                :options="operationTypeOptions"
                option-filter-prop="label"
                show-search
              />
              <UiButton size="sm" :loading="logLoading" @click="loadLogs">查询</UiButton>
              <span class="audit-trail__hint">共 {{ operationLogs.length }} 条</span>
            </a-space>
          </div>

          <!-- D-9 错误态：审计日志加载失败时提供重试 + 上报入口 -->
          <UiErrorRetryPanel
            v-if="logsLoadError"
            :error="logsLoadError"
            title="审计日志加载失败"
            compact
            @retry="loadLogs"
          />
          <UiEmpty
            v-else-if="!logLoading && operationLogs.length === 0"
            description="暂无审计日志"
          />
          <UiDataTable
            v-else
            :columns="logColumns"
            :data-source="operationLogs"
            :loading="logLoading"
            row-key="id"
            size="middle"
            class="audit-table"
            :page-size="20"
            :total="operationLogs.length"
            flat
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
          <div class="filter-bar">
            <a-space wrap>
              <a-checkbox v-model:checked="incidentFilter.unresolvedOnly">仅未解决</a-checkbox>
              <UiButton size="sm" :loading="incidentLoading" @click="loadIncidents">
                查询
              </UiButton>
              <span class="muted">共 {{ incidents.length }} 条</span>
            </a-space>
          </div>

          <!-- D-9 错误态：重大事件加载失败时提供重试 + 上报入口 -->
          <UiErrorRetryPanel
            v-if="incidentsLoadError"
            :error="incidentsLoadError"
            title="重大事件加载失败"
            compact
            @retry="loadIncidents"
          />
          <UiEmpty
            v-else-if="!incidentLoading && incidents.length === 0"
            description="暂无重大事件"
          />
          <UiDataTable
            v-else
            :columns="incidentColumns"
            :data-source="incidents"
            :loading="incidentLoading"
            row-key="id"
            size="middle"
            class="audit-table"
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
                <UiButton
                  v-if="!incidents[index].resolved"
                  size="sm"
                  variant="outline"
                  @click="openResolveModal(incidents[index])"
                >
                  解决事件
                </UiButton>
                <span v-else class="muted">-</span>
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>

        <!-- 异常留痕样本 -->
        <a-tab-pane key="diagnostic-samples" tab="异常留痕样本">
          <div class="filter-bar">
            <a-space wrap>
              <a-select
                v-model:value="sampleFilter.sampleType"
                placeholder="样本类型"
                allow-clear
                class="audit-trail__filter-input"
                :options="diagnosticSampleTypeOptions"
                option-filter-prop="label"
                show-search
              />
              <UiButton size="sm" :loading="sampleLoading" @click="loadDiagnosticSamples">
                查询
              </UiButton>
              <span class="audit-trail__hint">共 {{ diagnosticSamples.length }} 条</span>
            </a-space>
          </div>

          <!-- D-9 错误态：异常留痕样本加载失败时提供重试 + 上报入口 -->
          <UiErrorRetryPanel
            v-if="samplesLoadError"
            :error="samplesLoadError"
            title="异常留痕样本加载失败"
            compact
            @retry="loadDiagnosticSamples"
          />
          <UiEmpty
            v-else-if="!sampleLoading && diagnosticSamples.length === 0"
            description="暂无异常留痕样本"
          />
          <UiDataTable
            v-else
            :columns="sampleColumns"
            :data-source="diagnosticSamples"
            :loading="sampleLoading"
            row-key="id"
            size="middle"
            class="audit-table"
            :page-size="20"
            :total="diagnosticSamples.length"
            flat
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
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type {
  AuditTargetTypeCode,
  DiagnosticSampleTypeCode,
  DiagnosticSampleVO,
  OperationLogVO,
  OperationTypeCode,
} from '@/apis/mark/admin-audit'
import type { IncidentLevelCode, IncidentRecordVO } from '@/apis/mark/admin-dashboard'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
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
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { captureLoadFailure, showUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AdminAuditTrail' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  init: initExams,
  onExamChange: onSelectorChange,
} = useMarkExamSelector()

const activeTab = ref<'logs' | 'incidents' | 'diagnostic-samples'>('logs')

// ─── 审计日志 ──────────────────────────────────
const logLoading = ref(false)
const logsLoadError = ref<Error | null>(null)
const operationLogs = ref<OperationLogVO[]>([])
const logFilter = reactive<{ operationType?: OperationTypeCode }>({})
const operationTypeOptions = computed<Array<{ value: OperationTypeCode, label: string }>>(
  () => OPERATION_TYPE_OPTIONS,
)
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
      pageNum: 1,
      pageSize: 200,
    })
    operationLogs.value = readPageList(page, '审计日志加载失败，请稍后重试')
  } catch (error) {
    logsLoadError.value = captureLoadFailure(error, '审计日志加载失败')
    showUserError(error, '审计日志加载失败')
  } finally {
    logLoading.value = false
  }
}

// ─── 重大事件 ──────────────────────────────────
const incidentLoading = ref(false)
const incidentsLoadError = ref<Error | null>(null)
const incidents = ref<IncidentRecordVO[]>([])
const incidentFilter = reactive({ unresolvedOnly: false })
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
  if (!selectedExamId.value) return
  incidentLoading.value = true
  incidentsLoadError.value = null
  try {
    incidents.value = await listIncidents({
      examId: selectedExamId.value,
      unresolvedOnly: incidentFilter.unresolvedOnly,
    })
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
const diagnosticSampleTypeOptions = computed<
  Array<{ value: DiagnosticSampleTypeCode, label: string }>
>(() => DIAGNOSTIC_SAMPLE_TYPE_OPTIONS)
const sampleColumns = [
  { title: '样本类型', key: 'sampleType', dataIndex: 'sampleType', width: 160 },
  { title: '来源类型', key: 'sourceType', dataIndex: 'sourceType', width: 140 },
  { title: '处理说明', key: 'diagnostic', ellipsis: true },
  { title: '创建时间', key: 'createTime', dataIndex: 'createTime', width: 170 },
]

async function loadDiagnosticSamples() {
  if (!selectedExamId.value) return
  sampleLoading.value = true
  samplesLoadError.value = null
  try {
    diagnosticSamples.value = await listDiagnosticSamples({
      examId: selectedExamId.value,
      sampleType: sampleFilter.sampleType,
    })
  } catch (error) {
    samplesLoadError.value = captureLoadFailure(error, '异常留痕样本加载失败')
    showUserError(error, '异常留痕样本加载失败')
  } finally {
    sampleLoading.value = false
  }
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

function onExamChange(value: SelectValue, option: DefaultOptionType | DefaultOptionType[]) {
  onSelectorChange(value, option)
  operationLogs.value = []
  incidents.value = []
  diagnosticSamples.value = []
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
  min-height: 100vh;
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
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

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
