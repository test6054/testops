<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioComplianceMetricVO,
  PortfolioComplianceThresholdVO,
} from '@/apis/portfolio/compliance'
import { portfolioComplianceApi } from '@/apis/portfolio/compliance'
import { InputNumber, message, Switch } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
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
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const saving = ref(false)
const rows = ref<PortfolioComplianceThresholdVO[]>([])
const metricRows = ref<PortfolioComplianceMetricVO[]>([])
const metricLoading = ref(false)
const editorOpen = ref(false)
const editingId = ref<string | undefined>()
const deletingId = ref('')
const recomputing = ref(false)
const requestToken = ref(0)
const writing = computed(() => saving.value || Boolean(deletingId.value) || recomputing.value)

const form = reactive({
  metricCode: PortfolioComplianceAlertTypeCode.C001,
  scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
  targetValue: 0.5,
  yellowThreshold: 0.4,
  redThreshold: 0.3,
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
  { title: '操作', key: 'actions', width: 140 },
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

const needsDenominator = computed(
  () =>
    form.metricCode === PortfolioComplianceAlertTypeCode.C002 ||
    form.metricCode === PortfolioComplianceAlertTypeCode.C003,
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

function alertLevelLabel(code?: string) {
  if (code === 'NORMAL') return '正常'
  if (code === 'YELLOW') return '重要预警'
  if (code === 'RED') return '严重预警'
  if (!code) return '未计算'
  throw new Error(`不支持的合规预警等级: ${code}`)
}

function alertLevelTone(code?: string) {
  if (code === 'NORMAL') return 'green'
  if (code === 'YELLOW') return 'yellow'
  if (code === 'RED') return 'red'
  return 'gray'
}

async function loadMetrics() {
  const currentToken = requestToken.value
  metricLoading.value = true
  try {
    const nextRows = await portfolioComplianceApi.getMetrics({
      scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
    })
    if (requestToken.value !== currentToken) return
    metricRows.value = nextRows
  } catch (error) {
    if (requestToken.value !== currentToken) return
    metricRows.value = []
    showUserError(error, '加载当前合规结果失败')
  } finally {
    if (requestToken.value === currentToken) metricLoading.value = false
  }
}

function applyMetricDefaults(metric: PortfolioComplianceAlertTypeCode) {
  if (metric === PortfolioComplianceAlertTypeCode.C006) {
    form.compareDirection = PortfolioComplianceCompareDirectionCode.HIGHER_IS_WORSE
    form.targetValue = 0.3
    form.yellowThreshold = 0.4
    form.redThreshold = 0.5
    return
  }
  form.compareDirection = PortfolioComplianceCompareDirectionCode.LOWER_IS_WORSE
  form.targetValue = 0.5
  form.yellowThreshold = 0.4
  form.redThreshold = 0.3
}

async function loadList() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  beginLoad()
  loading.value = true
  try {
    const nextRows = await portfolioComplianceApi.listThreshold({
      scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
    })
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = nextRows
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    rows.value = []
    failLoad()
    showUserError(error, '加载失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

function openCreate() {
  editingId.value = undefined
  form.metricCode = PortfolioComplianceAlertTypeCode.C001
  form.scopeType = PortfolioComplianceScopeTypeCode.SCHOOL
  applyMetricDefaults(form.metricCode)
  form.denominatorBasisValue = undefined
  form.counselorRatioStandard = undefined
  form.enabled = true
  editorOpen.value = true
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
  const ordered =
    form.compareDirection === PortfolioComplianceCompareDirectionCode.LOWER_IS_WORSE
      ? form.targetValue > form.yellowThreshold && form.yellowThreshold > form.redThreshold
      : form.targetValue < form.yellowThreshold && form.yellowThreshold < form.redThreshold
  if (!ordered) {
    message.error('目标值、黄线和红线顺序与比较方向不一致')
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
    message.success('阈值已保存')
    editorOpen.value = false
    await loadList()
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
    message.success('阈值已删除')
    await loadList()
  } catch (error) {
    showUserError(error, '删除结构合规阈值失败')
  } finally {
    deletingId.value = ''
  }
}

async function recompute() {
  if (writing.value || loading.value) {
    return
  }
  recomputing.value = true
  try {
    metricRows.value = await portfolioComplianceApi.recompute({
      scopeType: PortfolioComplianceScopeTypeCode.SCHOOL,
    })
    message.success('已重算全校结构合规指标')
  } catch (error) {
    showUserError(error, '重算结构合规失败')
  } finally {
    recomputing.value = false
  }
}

onMounted(() => {
  void Promise.all([loadList(), loadMetrics()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="结构合规阈值" subtitle="配置 C001–C006">
        <template #actions>
          <UiButton variant="soft" :loading="recomputing" :disabled="writing" @click="recompute">
            重算全校
          </UiButton>
          <UiButton :disabled="writing" @click="openCreate"> 新建阈值 </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard title="学校级阈值">
      <a-spin :spinning="loading">
        <UiEmpty v-if="!loading && !rows.length" title="暂无内容" />
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
              <UiButton size="sm" variant="soft" :disabled="writing" @click="openEdit(record)">
                编辑
              </UiButton>
              <UiButton
                size="sm"
                variant="soft"
                :loading="deletingId === record.id"
                :disabled="writing"
                @click="deleteRow(record)"
              >
                删除
              </UiButton>
            </template>
          </template>
        </UiDataTable>
      </a-spin>
    </UiCard>
    <UiCard title="当前合规结果">
      <a-spin :spinning="metricLoading">
        <UiEmpty
          v-if="!metricLoading && !metricRows.length"
          description="尚未生成合规结果，请执行重算"
        />
        <UiDataTable
          v-else
          :columns="metricColumns"
          :data-source="metricRows"
          :pagination="false"
          row-key="metricCode"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'metricCode'">{{
              metricLabel(record.metricCode)
            }}</template>
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
              <UiTag :tone="alertLevelTone(record.alertLevel)">{{
                alertLevelLabel(record.alertLevel)
              }}</UiTag>
            </template>
          </template>
        </UiDataTable>
      </a-spin>
    </UiCard>
    <UiDrawer
      v-model:open="editorOpen"
      :title="editingId ? '编辑合规阈值' : '新建合规阈值'"
      width="480"
    >
      <div class="compliance-threshold-form">
        <label>指标</label>
        <a-select
          v-model:value="form.metricCode"
          :options="
            ALL_PORTFOLIO_COMPLIANCE_ALERT_TYPE_CODES.map((code) => ({
              value: code,
              label: PortfolioComplianceAlertTypeDescription[code],
            }))
          "
          :disabled="Boolean(editingId)"
          @change="applyMetricDefaults(form.metricCode)"
        />
        <label>目标值</label>
        <InputNumber
          v-model:value="form.targetValue"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-full"
        />
        <label>黄线</label>
        <InputNumber
          v-model:value="form.yellowThreshold"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-full"
        />
        <label>红线</label>
        <InputNumber
          v-model:value="form.redThreshold"
          :min="0"
          :max="1"
          :step="0.01"
          class="w-full"
        />
        <label>比较方向</label>
        <a-select
          v-model:value="form.compareDirection"
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
          <InputNumber
            v-model:value="form.denominatorBasisValue"
            :min="1"
            :step="1"
            class="w-full"
          />
        </template>
        <template v-if="form.metricCode === PortfolioComplianceAlertTypeCode.C003">
          <label>辅导员配比标准（1:N）</label>
          <InputNumber
            v-model:value="form.counselorRatioStandard"
            :min="1"
            :step="1"
            class="w-full"
          />
        </template>
        <label>启用</label>
        <Switch v-model:checked="form.enabled" />
      </div>
      <template #footer>
        <UiButton variant="soft" @click="editorOpen = false"> 取消 </UiButton>
        <UiButton :loading="saving" @click="saveRow"> 保存 </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.compliance-threshold-form {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
}
.compliance-threshold-form label {
  font-size: 13px;
  color: var(--color-text-secondary, #666);
}
.w-full {
  width: 100%;
}
</style>
