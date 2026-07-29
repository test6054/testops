<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioComplianceMetricDefinitionVO,
  PortfolioComplianceMetricVO,
  PortfolioComplianceThresholdVO,
} from '@/apis/portfolio/compliance'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { PortfolioComplianceAlertLevelCode } from '@/types/enums/portfolio-compliance-alert-level-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioComplianceApi } from '@/apis/portfolio/compliance'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import {
  PortfolioComplianceAlertLevelDescription,
  PortfolioComplianceAlertLevelToneMap,
} from '@/types/enums/portfolio-compliance-alert-level-enum'
import {
  ALL_PORTFOLIO_COMPLIANCE_ALERT_TYPE_CODES,
  PortfolioComplianceAlertTypeCode,
  PortfolioComplianceAlertTypeDescription,
} from '@/types/enums/portfolio-compliance-alert-type-enum'
import {
  PortfolioComplianceCompareDirectionCode,
  PortfolioComplianceCompareDirectionDescription,
} from '@/types/enums/portfolio-compliance-compare-direction-enum'
import {
  PortfolioComplianceMetricStatusCode,
  PortfolioComplianceMetricStatusDescription,
} from '@/types/enums/portfolio-compliance-metric-status-enum'
import {
  PortfolioComplianceScopeTypeCode,
  PortfolioComplianceScopeTypeDescription,
} from '@/types/enums/portfolio-compliance-scope-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const saving = ref(false)
const rows = ref<PortfolioComplianceThresholdVO[]>([])
const listLastSuccessAt = ref<string | null>(null)
const listRefreshError = ref<string | null>(null)
const metricRows = ref<PortfolioComplianceMetricVO[]>([])
const metricLoading = ref(false)
const metricLoadFailed = ref(false)
const metricLastSuccessAt = ref<string | null>(null)
const definitions = ref<PortfolioComplianceMetricDefinitionVO[]>([])
const definitionsLoading = ref(false)
const definitionsLoadFailed = ref(false)
const editorOpen = ref(false)
const editingId = ref<string | undefined>()
const deletingId = ref('')
const recomputing = ref(false)
const listRequestToken = ref(0)
const metricRequestToken = ref(0)
const writing = computed(() => saving.value || Boolean(deletingId.value) || recomputing.value)

const form = reactive({
  metricCode: PortfolioComplianceAlertTypeCode.C001,
  scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
  targetValue: null as number | null,
  yellowThreshold: null as number | null,
  redThreshold: null as number | null,
  compareDirection: PortfolioComplianceCompareDirectionCode.LOWER_IS_WORSE,
  denominatorBasisValue: undefined as number | undefined,
  counselorRatioStandard: undefined as number | undefined,
  enabled: true,
})

const columns: ColumnsType = [
  { title: '指标', key: 'metricCode', width: 160 },
  { title: '范围', key: 'scopeType', width: 80 },
  { title: '目标', dataIndex: 'targetValue', key: 'targetValue', width: 80 },
  { title: '黄线', dataIndex: 'yellowThreshold', key: 'yellowThreshold', width: 80 },
  { title: '红线', dataIndex: 'redThreshold', key: 'redThreshold', width: 80 },
  { title: '方向', key: 'compareDirection', width: 120 },
  {
    title: '分母基数',
    dataIndex: 'denominatorBasisValue',
    key: 'denominatorBasisValue',
    width: 100,
  },
  { title: '状态', key: 'enabled', width: 80 },
  { title: '主行动', key: 'actions', width: 140 },
]

const metricColumns: ColumnsType = [
  { title: '指标', key: 'metricCode', width: 180 },
  { title: '当前值', dataIndex: 'metricValue', key: 'metricValue', width: 100 },
  { title: '分子/分母', key: 'fraction', width: 120 },
  { title: '计算状态', key: 'metricStatus', width: 120 },
  { title: '预警', key: 'alertLevel', width: 100 },
  { title: '结果说明', dataIndex: 'summaryText', key: 'summaryText' },
  { title: '计算时间', dataIndex: 'computedTime', key: 'computedTime', width: 170 },
]

const currentDefinition = computed(() =>
  definitions.value.find((item) => item.metricCode === form.metricCode) ?? null,
)

const needsDenominator = computed(() => Boolean(currentDefinition.value?.requiresDenominatorBasis))
const needsCounselorRatio = computed(() =>
  Boolean(currentDefinition.value?.requiresCounselorRatioStandard),
)

function metricLabel(code: string) {
  return strictEnumLabel(
    PortfolioComplianceAlertTypeDescription,
    code as PortfolioComplianceAlertTypeCode,
    '结构合规指标',
  )
}

function scopeLabel(code: string) {
  return strictEnumLabel(
    PortfolioComplianceScopeTypeDescription,
    code as PortfolioComplianceScopeTypeCode,
    '合规范围',
  )
}

function directionLabel(code: string) {
  return strictEnumLabel(
    PortfolioComplianceCompareDirectionDescription,
    code as PortfolioComplianceCompareDirectionCode,
    '比较方向',
  )
}

function metricStatusLabel(code: string) {
  return strictEnumLabel(
    PortfolioComplianceMetricStatusDescription,
    code as PortfolioComplianceMetricStatusCode,
    '合规计算状态',
  )
}

function alertLevelLabel(code?: PortfolioComplianceAlertLevelCode) {
  if (!code) return '未计算'
  const label = PortfolioComplianceAlertLevelDescription[code]
  if (!label) {
    throw new Error(`不支持的合规预警等级: ${code}`)
  }
  return label
}

function alertLevelTone(code?: PortfolioComplianceAlertLevelCode) {
  if (!code) return 'gray'
  return PortfolioComplianceAlertLevelToneMap[code] ?? 'gray'
}

/** 按指标定义重置比较方向，并清空可保存阈值，禁止写入示例默认值。 */
function applyMetricDefinition(metric: PortfolioComplianceAlertTypeCode) {
  const definition = definitions.value.find((item) => item.metricCode === metric)
  if (!definition) {
    showFormValidationMessage('指标定义尚未加载，请稍后重试')
    return
  }
  form.compareDirection = definition.compareDirection
  form.targetValue = null
  form.yellowThreshold = null
  form.redThreshold = null
  if (!definition.requiresDenominatorBasis) {
    form.denominatorBasisValue = undefined
  }
  if (!definition.requiresCounselorRatioStandard) {
    form.counselorRatioStandard = undefined
  }
}

async function loadDefinitions() {
  definitionsLoading.value = true
  definitionsLoadFailed.value = false
  try {
    definitions.value = await portfolioComplianceApi.listMetricDefinitions()
  } catch (error) {
    definitionsLoadFailed.value = true
    showUserError(error, '加载合规指标定义失败')
  } finally {
    definitionsLoading.value = false
  }
}

async function loadMetrics() {
  const currentToken = ++metricRequestToken.value
  metricLoading.value = true
  metricLoadFailed.value = false
  try {
    const nextRows = await portfolioComplianceApi.getMetrics({
      scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
    })
    if (metricRequestToken.value !== currentToken) {
      return
    }
    metricRows.value = nextRows
    metricLastSuccessAt.value = new Date().toISOString()
  } catch (error) {
    if (metricRequestToken.value !== currentToken) {
      return
    }
    metricLoadFailed.value = true
    showUserError(error, '加载当前合规结果失败')
  } finally {
    if (metricRequestToken.value === currentToken) {
      metricLoading.value = false
    }
  }
}

async function loadList(options?: { asRefresh?: boolean }) {
  const currentToken = ++listRequestToken.value
  const asRefresh = Boolean(options?.asRefresh)
  if (!asRefresh) {
    beginLoad()
  }
  loading.value = true
  listRefreshError.value = null
  try {
    const nextRows = await portfolioComplianceApi.listThreshold({
      scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
    })
    if (listRequestToken.value !== currentToken) {
      return
    }
    rows.value = nextRows
    listLastSuccessAt.value = new Date().toISOString()
    okLoad()
  } catch (error) {
    if (listRequestToken.value !== currentToken) {
      return
    }
    if (asRefresh && rows.value.length > 0) {
      listRefreshError.value = '阈值已写入，列表刷新失败；当前仍显示上次成功数据'
      showUserError(error, '阈值列表刷新失败')
      return
    }
    failLoad()
    showUserError(error, '加载失败')
  } finally {
    if (listRequestToken.value === currentToken) {
      loading.value = false
    }
  }
}

async function openCreate() {
  if (definitions.value.length === 0) {
    await loadDefinitions()
  }
  if (definitionsLoadFailed.value || definitions.value.length === 0) {
    showFormValidationMessage('指标定义不可用，无法新建阈值')
    return
  }
  editingId.value = undefined
  form.metricCode = PortfolioComplianceAlertTypeCode.C001
  form.scopeType = PortfolioComplianceScopeTypeCode.SCHOOL
  applyMetricDefinition(form.metricCode)
  form.enabled = true
  editorOpen.value = true
}

/** 合规阈值行：编辑为主行动 */
function buildThresholdRowActions(record: PortfolioComplianceThresholdVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑', tone: 'primary', disabled: writing.value },
    {
      key: 'delete',
      label: '删除',
      tone: 'danger',
      disabled: writing.value || deletingId.value === record.id,
    },
  ]
}

function handleThresholdRowAction(key: string, record: PortfolioComplianceThresholdVO): void {
  if (key === 'edit') {
    openEdit(record)
    return
  }
  if (key === 'delete') {
    void deleteRow(record)
  }
}
function openEdit(row: PortfolioComplianceThresholdVO) {
  editingId.value = row.id
  form.metricCode = row.metricCode as PortfolioComplianceAlertTypeCode
  form.scopeType = row.scopeType as PortfolioComplianceScopeTypeCode
  form.targetValue = Number(row.targetValue)
  form.yellowThreshold = Number(row.yellowThreshold)
  form.redThreshold = Number(row.redThreshold)
  form.compareDirection = row.compareDirection as PortfolioComplianceCompareDirectionCode
  form.denominatorBasisValue = row.denominatorBasisValue
    ? Number(row.denominatorBasisValue)
    : undefined
  form.counselorRatioStandard = row.counselorRatioStandard
  form.enabled = row.enabled
  editorOpen.value = true
}

async function saveRow() {
  if (writing.value) {
    return
  }
  if (
    form.targetValue == null
    || form.yellowThreshold == null
    || form.redThreshold == null
  ) {
    showFormValidationMessage('请人工填写目标值、黄线与红线，不得留空')
    return
  }
  const definition = currentDefinition.value
  if (!definition) {
    showFormValidationMessage('指标定义缺失，无法保存')
    return
  }
  if (form.compareDirection !== definition.compareDirection) {
    showFormValidationMessage('比较方向须与指标定义一致')
    return
  }
  const ordered
    = form.compareDirection === PortfolioComplianceCompareDirectionCode.LOWER_IS_WORSE
      ? form.targetValue > form.yellowThreshold && form.yellowThreshold > form.redThreshold
      : form.targetValue < form.yellowThreshold && form.yellowThreshold < form.redThreshold
  if (!ordered) {
    void message.error('目标值、黄线和红线顺序与比较方向不一致')
    return
  }
  saving.value = true
  try {
    await portfolioComplianceApi.saveThreshold({
      id: editingId.value,
      metricCode: form.metricCode,
      scopeType: form.scopeType,
      targetValue: String(form.targetValue),
      yellowThreshold: String(form.yellowThreshold),
      redThreshold: String(form.redThreshold),
      compareDirection: form.compareDirection,
      denominatorBasisValue:
        form.denominatorBasisValue == null ? undefined : String(form.denominatorBasisValue),
      counselorRatioStandard: form.counselorRatioStandard,
      enabled: form.enabled,
    })
    void message.success('阈值已保存')
    editorOpen.value = false
    await loadList({ asRefresh: true })
  } catch (error) {
    showUserError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteRow(row: PortfolioComplianceThresholdVO) {
  if (writing.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '确认删除合规阈值',
    content: `确认删除“${metricLabel(row.metricCode)}”阈值？删除后该指标将无法参与合规重算。`,
    type: 'warning',
    okText: '确认删除',
  })
  if (!confirmed || writing.value) {
    return
  }
  deletingId.value = row.id
  try {
    await portfolioComplianceApi.deleteThreshold({ id: row.id })
    void message.success('阈值已删除')
    rows.value = rows.value.filter((item) => item.id !== row.id)
    await loadList({ asRefresh: true })
  } catch (error) {
    showUserError(error, '删除结构合规阈值失败')
  } finally {
    deletingId.value = ''
  }
}

async function recompute() {
  if (writing.value || metricLoading.value) {
    return
  }
  const currentToken = ++metricRequestToken.value
  recomputing.value = true
  metricLoadFailed.value = false
  try {
    const nextRows = await portfolioComplianceApi.recompute({
      scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
    })
    if (metricRequestToken.value !== currentToken) {
      return
    }
    metricRows.value = nextRows
    metricLastSuccessAt.value = new Date().toISOString()
    void message.success('已重算全校结构合规指标')
  } catch (error) {
    if (metricRequestToken.value !== currentToken) {
      return
    }
    metricLoadFailed.value = true
    showUserError(error, '重算结构合规失败')
  } finally {
    recomputing.value = false
  }
}


const ComplianceThresholdSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadError.value && rows.value.length === 0) {
    return []
  }
  const enabledCount = rows.value.filter((row) => row.enabled === true).length
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '合规阈值',
      value: rows.value.length,
      clickable: true,
      helper: '当前已加载',
    },
  ]
  if (!loadError.value) {
    metrics.push({
      key: 'enabled',
      label: '启用',
      value: enabledCount,
      helper: '仅当前列表',
    })
  }
  return applySpotlightEmphasis(metrics, { primaryKey: 'total', actionLabel: '刷新' })
})

const ComplianceThresholdWorkbenchSubtitle = computed(() => {
  if (loadError.value) return '加载失败'
  return `${rows.value.length} 条`
})

function onComplianceThresholdSignalClick(_key: string) {
  void loadList({ asRefresh: true })
}

onMounted(() => {
  void Promise.all([loadDefinitions(), loadList(), loadMetrics()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="结构合规阈值" :subtitle="ComplianceThresholdWorkbenchSubtitle">
        <template #actions>
          <UiButton
            size="sm"
            variant="soft"
            :loading="recomputing"
            :disabled="writing"
            @click="recompute"
          >
            重算全校
          </UiButton>
          <UiButton
            size="sm"
            variant="primary"
            :disabled="writing || definitionsLoading || definitionsLoadFailed"
            @click="() => void openCreate()"
          >
            新建阈值
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="ComplianceThresholdSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="ComplianceThresholdSignalMetrics"
        @metric-click="onComplianceThresholdSignalClick"
      />
    </template>
    <UiAlertStrip
      v-if="definitionsLoadFailed"
      tone="error"
      title="指标定义加载失败"
      class="dp-mb-component"
    />
    <UiAlertStrip
      v-if="listRefreshError"
      tone="warning"
      title="列表刷新失败"
      :description="listRefreshError"
      class="dp-mb-component"
    />
    <UiCard title="学校级阈值">
      <UiSpin :spinning="loading">
        <WorkbenchContextGateStrip
          v-if="!loading && !rows.length && !loadError"
          tag="未配置"
          body="暂无合规阈值，请先新建阈值"
          cta-label="新建阈值"
          @cta="() => void openCreate()"
        />
        <UiDataTable
          :load-error="loadError"
          v-else
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'metricCode'">
              {{ metricLabel(record.metricCode) }}
            </template>
            <template v-else-if="column.key === 'scopeType'">
              {{ scopeLabel(record.scopeType) }}
            </template>
            <template v-else-if="column.key === 'compareDirection'">
              {{ directionLabel(record.compareDirection) }}
            </template>
            <template v-else-if="column.key === 'enabled'">
              <UiTag :tone="record.enabled ? 'green' : 'gray'">
                {{ record.enabled ? '启用' : '停用' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :max-visible="2"
                :items="buildThresholdRowActions(record)"
                split
                @action="(key) => handleThresholdRowAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiSpin>
      <p v-if="listLastSuccessAt" class="compliance-threshold-meta">
        阈值上次成功同步：{{ listLastSuccessAt }}
      </p>
    </UiCard>
    <UiCard title="当前合规结果">
      <UiAlertStrip
        v-if="metricLoadFailed"
        tone="warning"
        title="合规结果同步失败"
        class="dp-mb-component"
      />
      <UiSpin :spinning="metricLoading">
        <WorkbenchContextGateStrip
          v-if="!metricLoading && !metricRows.length && !metricLoadFailed"
          tag="无结果"
          body="尚未生成合规结果，请执行重算"
          cta-label="重算全校"
          @cta="recompute"
        />
        <UiDataTable
          v-else-if="metricRows.length"
          :columns="metricColumns"
          :data-source="metricRows"
          :pagination="false"
          row-key="metricCode"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'metricCode'">
              {{ metricLabel(record.metricCode) }}
            </template>
            <template v-else-if="column.key === 'fraction'">
              {{ record.numeratorValue ?? '—' }} / {{ record.denominatorValue ?? '—' }}
            </template>
            <template v-else-if="column.key === 'metricStatus'">
              <UiTag
                :tone="
                  record.metricStatus === PortfolioComplianceMetricStatusCode.COMPUTED
                    ? 'green'
                    : 'yellow'
                "
              >
                {{ metricStatusLabel(record.metricStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'alertLevel'">
              <UiTag :tone="alertLevelTone(record.alertLevel)">
                {{ alertLevelLabel(record.alertLevel) }}
              </UiTag>
            </template>
          </template>
        </UiDataTable>
      </UiSpin>
    </UiCard>
    <UiDrawer
      v-model:open="editorOpen"
      :title="editingId ? '编辑合规阈值' : '新建合规阈值'"
      width="480"
    >
      <div class="compliance-threshold-form">
        <label>指标</label>
        <UiSelect
          size="sm"
          v-model="form.metricCode"
          :options="
            ALL_PORTFOLIO_COMPLIANCE_ALERT_TYPE_CODES.map((code) => ({
              value: code,
              label: PortfolioComplianceAlertTypeDescription[code],
            }))
          "
          :disabled="Boolean(editingId)"
          @change="applyMetricDefinition(form.metricCode)"
        />
        <UiAlertStrip
          v-if="currentDefinition && !editingId"
          dense
          tone="info"
          title="须人工填写正式阈值"
          :description="`${currentDefinition.unitLabel}。${currentDefinition.suggestedRangeHint}`"
        />
        <label>目标值</label>
        <UiInputNumber
          size="sm"
          v-model="form.targetValue"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-full"
          placeholder="必填，无默认值"
        />
        <label>黄线</label>
        <UiInputNumber
          size="sm"
          v-model="form.yellowThreshold"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-full"
          placeholder="必填，无默认值"
        />
        <label>红线</label>
        <UiInputNumber
          size="sm"
          v-model="form.redThreshold"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-full"
          placeholder="必填，无默认值"
        />
        <label>比较方向</label>
        <UiSelect
          size="sm"
          v-model="form.compareDirection"
          disabled
          :options="[
            {
              value: PortfolioComplianceCompareDirectionCode.LOWER_IS_WORSE,
              label: PortfolioComplianceCompareDirectionDescription.LOWER_IS_WORSE,
            },
            {
              value: PortfolioComplianceCompareDirectionCode.HIGHER_IS_WORSE,
              label: PortfolioComplianceCompareDirectionDescription.HIGHER_IS_WORSE,
            },
          ]"
        />
        <template v-if="needsDenominator">
          <label>{{
            form.metricCode === PortfolioComplianceAlertTypeCode.C002
              ? '应配备思政教师数'
              : '折合学籍学生数'
          }}</label>
          <UiInputNumber
            size="sm"
            v-model="form.denominatorBasisValue"
            :min="1"
            :step="1"
            class="w-full"
          />
        </template>
        <template v-if="needsCounselorRatio">
          <label>辅导员配比标准（1:N）</label>
          <UiInputNumber
            size="sm"
            v-model="form.counselorRatioStandard"
            :min="1"
            :step="1"
            class="w-full"
          />
        </template>
        <label>启用</label>
        <UiSwitch v-model="form.enabled" size="sm" />
      </div>
      <template #footer>
        <UiButton size="sm" variant="soft" @click="editorOpen = false"> 取消 </UiButton>
        <UiButton size="sm" variant="primary" :loading="saving" :disabled="writing" @click="saveRow"> 保存 </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.compliance-threshold-form {
  display: grid;
  gap: var(--dp-space-component-tight);
  grid-template-columns: 1fr;
}
.compliance-threshold-form label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.compliance-threshold-meta {
  margin: var(--dp-space-component-tight) 0 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.w-full {
  width: 100%;
}
</style>
