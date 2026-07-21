<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PfEligibilityExplainStructDto,
  PfImpactReportStatusCode,
  PfSceneCode,
  PfScoreExplainStructDto,
  PortfolioEligibilityEvalLogVO,
  PortfolioIndicatorAutoCollectSummaryResponse,
  PortfolioIndicatorCollectedValueVO,
  PortfolioIndicatorComputeLogVO,
  PortfolioIndicatorScoreComputeResult,
  PortfolioPublishImpactReportVO,
  PortfolioTenantConfigAuditLogVO,
} from '@/apis/portfolio/indicator-types'
import {
  PF_IMPACT_REPORT_STATUS_TONE,
  PF_SCORE_RULE_TYPE_OPTIONS,
  PfImpactReportStatusDescription,
  PfSceneCodeDescription,
} from '@/apis/portfolio/indicator-types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PortfolioIndicatorTemplateParams } from '@/utils/indicator-template-params'
import { defaultTemplateParams } from '@/utils/indicator-template-params'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import PortfolioIndicatorExplainDrawer from '@/components/portfolio/PortfolioIndicatorExplainDrawer.vue'
import PortfolioIndicatorTemplateParamsForm from '@/components/portfolio/PortfolioIndicatorTemplateParamsForm.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioIndicatorExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function sceneCodeLabel(value: PfSceneCode): string {
  return strictEnumLabel(PfSceneCodeDescription, value, '场景编码')
}

function impactReportStatusLabel(value: PfImpactReportStatusCode): string {
  return strictEnumLabel(PfImpactReportStatusDescription, value, '影响报告状态')
}

function impactReportStatusTone(value: PfImpactReportStatusCode): BadgeTone {
  return strictEnumTone(PF_IMPACT_REPORT_STATUS_TONE, value, '影响报告状态')
}

const activeTab = ref('trial')
const indicatorOpsTabItems = [
  { key: 'trial', label: '规则试算' },
  { key: 'snapshot', label: '快照计分' },
  { key: 'diff', label: '快照对比' },
  { key: 'compute-log', label: '计分日志' },
  { key: 'audit-log', label: '配置审计' },
  { key: 'eval-log', label: '资格评估日志' },
  { key: 'collect', label: '来源采集' },
  { key: 'impact', label: '影响报告' },
]
const route = useRoute()
const operationKey = ref('')
const operating = computed(() => Boolean(operationKey.value))
const computing = computed(() => operationKey.value.startsWith('compute:'))
const loadState = reactive({
  compute: false,
  audit: false,
  eval: false,
  impact: false,
  collect: false,
})
const loadError = reactive({
  compute: false,
  audit: false,
  eval: false,
  impact: false,
  collect: false,
})
const requestToken = reactive({ compute: 0, audit: 0, eval: 0, impact: 0, collect: 0, explain: 0 })
const computeResult = ref<PortfolioIndicatorScoreComputeResult | null>(null)
const explainOpen = ref(false)
const explainText = ref('')
const scoreExplain = ref<PfScoreExplainStructDto | undefined>()
const eligibilityExplain = ref<PfEligibilityExplainStructDto | undefined>()

const trialForm = reactive({
  ruleType: 'THRESHOLD',
  indicatorCode: 'T001',
  rawValue: 8,
  auditRequired: false,
  auditApproved: true,
})
const trialParams = ref<PortfolioIndicatorTemplateParams>(defaultTemplateParams('THRESHOLD'))

watch(
  () => trialForm.ruleType,
  (ruleType) => {
    trialParams.value = defaultTemplateParams(ruleType)
  },
)

const snapshotForm = reactive({
  teacherId: '',
  snapshotId: '',
  indicatorCode: 'T001',
  rawValue: 8,
})

const diffForm = reactive({ snapshotIdA: '', snapshotIdB: '' })

const computeLogs = ref<PortfolioIndicatorComputeLogVO[]>([])
const auditLogs = ref<PortfolioTenantConfigAuditLogVO[]>([])
const evalLogs = ref<PortfolioEligibilityEvalLogVO[]>([])
const impactReports = ref<PortfolioPublishImpactReportVO[]>([])
const pageQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const computeTotal = ref(0)
const auditTotal = ref(0)
const evalTotal = ref(0)
const impactTotal = ref(0)
const collectTeacherId = ref('')
const collectContextTeacherId = ref('')
const collectSummary = ref<PortfolioIndicatorAutoCollectSummaryResponse | null>(null)
const collectItems = ref<PortfolioIndicatorCollectedValueVO[]>([])
const collectTotal = ref(0)
const collectPageNum = ref(1)
const collectPageSize = ref(DEFAULT_LIST_PAGE_SIZE)

/** 运维动作必须串行，避免试算、正式计分、采集与导出跨上下文覆盖结果。 */
function beginOperation(key: string): boolean {
  if (operating.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}
const collectColumns: ColumnsType = [
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '通道', dataIndex: 'channelCode', key: 'channelCode', width: 120 },
  { title: '采集', dataIndex: 'collected', key: 'collected', width: 72 },
  { title: '原始值', dataIndex: 'rawValue', key: 'rawValue', width: 88 },
  { title: '说明', dataIndex: 'skipReason', key: 'skipReason' },
]

const computeColumns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 100 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '得分', dataIndex: 'finalScore', key: 'finalScore', width: 80 },
  { title: '时间', dataIndex: 'computedTime', key: 'computedTime', width: 160 },
  { title: '操作', key: 'actions', width: 72 },
]

const auditColumns: ColumnsType = [
  { title: '业务', dataIndex: 'bizType', key: 'bizType', width: 120 },
  { title: '键', dataIndex: 'bizKey', key: 'bizKey', width: 120 },
  { title: '操作', dataIndex: 'operation', key: 'operation', width: 100 },
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
]

const evalColumns: ColumnsType = [
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 100 },
  { title: '规则', dataIndex: 'eligibilityCode', key: 'eligibilityCode', width: 140 },
  { title: '结论', key: 'eligible', width: 80 },
  { title: '时间', dataIndex: 'evaluatedTime', key: 'evaluatedTime', width: 160 },
  { title: '操作', key: 'actions', width: 72 },
]

const impactColumns: ColumnsType = [
  { title: '场景', dataIndex: 'sceneCode', key: 'sceneCode', width: 100 },
  { title: '状态', dataIndex: 'reportStatus', key: 'reportStatus', width: 100 },
  { title: '过期', dataIndex: 'expiredTime', key: 'expiredTime', width: 160 },
  { title: '编号', dataIndex: 'id', key: 'id' },
  { title: '操作', key: 'actions', width: 80 },
]

function showComputeResult(result: PortfolioIndicatorScoreComputeResult) {
  requestToken.explain++
  computeResult.value = result
  explainText.value = result.explainText
  scoreExplain.value = result.explainStruct
  eligibilityExplain.value = undefined
}

async function runTrial() {
  const operation = 'compute:trial'
  if (!beginOperation(operation)) return
  const request = {
    ...trialForm,
    indicatorCode: trialForm.indicatorCode.trim(),
    params: trialParams.value,
  }
  if (!request.indicatorCode) {
    showFormValidationMessage('请填写指标编码')
    endOperation(operation)
    return
  }
  computeResult.value = null
  try {
    const result = await portfolioIndicatorTenantApi.computeTrial(request)
    showComputeResult(result)
    void message.success(
      result.finalScore != null ? `试算得分 ${result.finalScore}` : '试算完成，待审核',
    )
  } catch (error) {
    showUserError(error, '指标试算失败')
  } finally {
    endOperation(operation)
  }
}

async function runSnapshotCompute() {
  const request = {
    teacherId: snapshotForm.teacherId.trim(),
    snapshotId: snapshotForm.snapshotId.trim(),
    indicatorCode: snapshotForm.indicatorCode.trim(),
    rawValue: snapshotForm.rawValue,
  }
  if (!request.teacherId || !request.snapshotId || !request.indicatorCode) {
    showFormValidationMessage('请填写教师、快照和指标编码')
    return
  }
  const operation = `compute:snapshot:${request.snapshotId}:${request.teacherId}:${request.indicatorCode}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '确认执行正式计分？',
    content: `将按正式快照 ${request.snapshotId} 为教师 ${request.teacherId} 的指标 ${request.indicatorCode} 写入计分日志；该结果会进入画像与审计链。`,
    type: 'warning',
    okText: '确认计分',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  computeResult.value = null
  try {
    const result = await portfolioIndicatorTenantApi.computeSnapshot(request)
    if (
      snapshotForm.snapshotId.trim() !== request.snapshotId ||
      snapshotForm.teacherId.trim() !== request.teacherId ||
      snapshotForm.indicatorCode.trim() !== request.indicatorCode
    ) {
      return
    }
    showComputeResult(result)
    void message.success(
      result.finalScore != null ? `正式计分 ${result.finalScore}` : '计分完成，待审核',
    )
    await loadComputeLogs()
  } catch (error) {
    showUserError(error, '正式计分失败')
  } finally {
    endOperation(operation)
  }
}

async function loadComputeLogs() {
  const currentToken = ++requestToken.compute
  const request = { ...pageQuery }
  loadState.compute = true
  loadError.compute = false
  try {
    const page = await portfolioIndicatorTenantApi.pageComputeLog(request)
    if (requestToken.compute !== currentToken) return
    computeLogs.value = page.list
    computeTotal.value = page.total
  } catch (error) {
    if (requestToken.compute !== currentToken) return
    computeLogs.value = []
    computeTotal.value = 0
    loadError.compute = true
    showUserError(error, '加载计分日志失败')
  } finally {
    if (requestToken.compute === currentToken) loadState.compute = false
  }
}

async function loadAuditLogs() {
  const currentToken = ++requestToken.audit
  const request = { ...pageQuery }
  loadState.audit = true
  loadError.audit = false
  try {
    const page = await portfolioIndicatorTenantApi.pageAuditLog(request)
    if (requestToken.audit !== currentToken) return
    auditLogs.value = page.list
    auditTotal.value = page.total
  } catch (error) {
    if (requestToken.audit !== currentToken) return
    auditLogs.value = []
    auditTotal.value = 0
    loadError.audit = true
    showUserError(error, '加载配置审计失败')
  } finally {
    if (requestToken.audit === currentToken) loadState.audit = false
  }
}

async function loadEvalLogs() {
  const currentToken = ++requestToken.eval
  const request = { ...pageQuery }
  loadState.eval = true
  loadError.eval = false
  try {
    const page = await portfolioIndicatorTenantApi.pageEvalLog(request)
    if (requestToken.eval !== currentToken) return
    evalLogs.value = page.list
    evalTotal.value = page.total
  } catch (error) {
    if (requestToken.eval !== currentToken) return
    evalLogs.value = []
    evalTotal.value = 0
    loadError.eval = true
    showUserError(error, '加载资格评估日志失败')
  } finally {
    if (requestToken.eval === currentToken) loadState.eval = false
  }
}

async function loadImpactReports() {
  const currentToken = ++requestToken.impact
  const request = { ...pageQuery }
  loadState.impact = true
  loadError.impact = false
  try {
    const page = await portfolioIndicatorTenantApi.pageImpactReport(request)
    if (requestToken.impact !== currentToken) return
    impactReports.value = page.list
    impactTotal.value = page.total
  } catch (error) {
    if (requestToken.impact !== currentToken) return
    impactReports.value = []
    impactTotal.value = 0
    loadError.impact = true
    showUserError(error, '加载影响报告失败')
  } finally {
    if (requestToken.impact === currentToken) loadState.impact = false
  }
}

async function openExplain(
  logId: string,
  logType: 'SCORE' | 'ELIGIBILITY',
  teacherId: string,
  text?: string,
) {
  const currentToken = ++requestToken.explain
  explainText.value = text ?? ''
  scoreExplain.value = undefined
  eligibilityExplain.value = undefined
  try {
    const result = await portfolioIndicatorTenantApi.getExplain({
      logId,
      logType,
      teacherId,
    })
    if (requestToken.explain !== currentToken) return
    scoreExplain.value = result.scoreExplain
    eligibilityExplain.value = result.eligibilityExplain
    explainOpen.value = true
  } catch (error) {
    if (requestToken.explain !== currentToken) return
    showUserError(error, '加载计分解释失败')
  }
}

async function exportSnapshotDiff() {
  if (!diffForm.snapshotIdA || !diffForm.snapshotIdB) {
    showFormValidationMessage('请填写两个快照编号')
    return
  }
  const snapshotIdA = diffForm.snapshotIdA.trim()
  const snapshotIdB = diffForm.snapshotIdB.trim()
  const operation = `export:diff:${snapshotIdA}:${snapshotIdB}`
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioIndicatorTenantApi.exportSnapshotDiff({
      snapshotIdA,
      snapshotIdB,
    })
    await downloadPortfolioIndicatorExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条差异`)
  } catch (error) {
    showUserError(error, '导出快照差异失败')
  } finally {
    endOperation(operation)
  }
}

async function exportImpact(id: string) {
  const operation = `export:impact:${id}`
  if (!beginOperation(operation)) return
  try {
    const result = await portfolioIndicatorTenantApi.exportImpactReport({ id })
    await downloadPortfolioIndicatorExcelExport(result)
    void message.success('影响报告已导出')
  } catch (error) {
    showUserError(error, '导出影响报告失败')
  } finally {
    endOperation(operation)
  }
}

async function runAutoCollect() {
  const teacherId = collectTeacherId.value.trim()
  if (!teacherId) {
    showFormValidationMessage('请填写教师编号')
    return
  }
  const operation = `collect:${teacherId}`
  if (!beginOperation(operation)) return
  const currentToken = ++requestToken.collect
  loadState.collect = true
  loadError.collect = false
  try {
    const summary = await portfolioIndicatorTenantApi.getAutoCollectSummary({ teacherId })
    if (requestToken.collect !== currentToken || collectTeacherId.value.trim() !== teacherId) return
    collectContextTeacherId.value = teacherId
    collectSummary.value = summary
    collectPageNum.value = 1
    await loadCollectPage()
    void message.success(
      `采集 ${collectSummary.value.collectedCount} 条，跳过 ${collectSummary.value.skippedCount} 条`,
    )
  } catch (error) {
    if (requestToken.collect !== currentToken) return
    collectContextTeacherId.value = ''
    collectSummary.value = null
    collectItems.value = []
    collectTotal.value = 0
    loadError.collect = true
    showUserError(error, '指标自动采集失败')
  } finally {
    if (requestToken.collect === currentToken) loadState.collect = false
    endOperation(operation)
  }
}

async function loadCollectPage() {
  const teacherId = collectContextTeacherId.value
  const currentToken = ++requestToken.collect
  if (!teacherId || !collectSummary.value) {
    collectItems.value = []
    collectTotal.value = 0
    return
  }
  const request = {
    teacherId,
    pageNum: collectPageNum.value,
    pageSize: collectPageSize.value,
  }
  loadState.collect = true
  loadError.collect = false
  try {
    const result = await portfolioIndicatorTenantApi.pageAutoCollectItems(request)
    if (requestToken.collect !== currentToken || collectContextTeacherId.value !== teacherId) return
    collectItems.value = result.list
    collectTotal.value = result.total
  } catch (error) {
    if (requestToken.collect !== currentToken) return
    collectItems.value = []
    collectTotal.value = 0
    loadError.collect = true
    showUserError(error, '加载采集明细失败')
  } finally {
    if (requestToken.collect === currentToken) loadState.collect = false
  }
}

function handleCollectPageChange(event: { current: number; pageSize: number }) {
  collectPageNum.value = event.current
  collectPageSize.value = event.pageSize
  void loadCollectPage()
}

function onTabChange(key: string | number) {
  if (operating.value) return
  activeTab.value = String(key)
  computeResult.value = null
  pageQuery.pageNum = 1
  if (activeTab.value === 'compute-log') {
    loadComputeLogs()
  } else if (activeTab.value === 'audit-log') {
    loadAuditLogs()
  } else if (activeTab.value === 'eval-log') {
    loadEvalLogs()
  } else if (activeTab.value === 'impact') {
    loadImpactReports()
  }
}

function handlePageChange(event: { current: number; pageSize: number }) {
  pageQuery.pageNum = event.current
  pageQuery.pageSize = event.pageSize
  if (activeTab.value === 'compute-log') {
    void loadComputeLogs()
  } else if (activeTab.value === 'audit-log') {
    void loadAuditLogs()
  } else if (activeTab.value === 'eval-log') {
    void loadEvalLogs()
  } else if (activeTab.value === 'impact') {
    void loadImpactReports()
  }
}

/** 快照深链是运维页上下文真源；同页切换快照时必须同步，避免继续操作旧快照。 */
function syncSnapshotFromRoute() {
  computeResult.value = null
  const snapshotId = route.query.snapshotId
  if (typeof snapshotId === 'string' && snapshotId) {
    snapshotForm.snapshotId = snapshotId
    activeTab.value = 'snapshot'
    return
  }
  snapshotForm.snapshotId = ''
}

watch(collectTeacherId, (value) => {
  if (value.trim() === collectContextTeacherId.value) return
  requestToken.collect++
  collectContextTeacherId.value = ''
  collectSummary.value = null
  collectItems.value = []
  collectTotal.value = 0
  loadState.collect = false
  loadError.collect = false
})

onMounted(() => {
  syncSnapshotFromRoute()
  loadComputeLogs()
})

watch(
  () => route.query.snapshotId,
  () => {
    syncSnapshotFromRoute()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="指标计分与审计" />
    </template>
    <UiCard>
      <UiSectionTabs
        :model-value="activeTab"
        :items="indicatorOpsTabItems"
        compact
        divided
        @change="onTabChange"
      />
      <template v-if="activeTab === 'trial'">
        <div class="form-grid">
          <UiSelect
            size="sm"
            v-model="trialForm.ruleType"
            :options="PF_SCORE_RULE_TYPE_OPTIONS"
            placeholder="规则类型"
            style="width: 160px"
            :disabled="operating"
          />
          <UiInput
            size="sm"
            v-model="trialForm.indicatorCode"
            placeholder="指标编码"
            :disabled="operating"
          />
          <UiInputNumber
            size="sm"
            v-model="trialForm.rawValue"
            placeholder="原始值"
            style="width: 120px"
            :disabled="operating"
          />
          <UiSwitch
            size="sm"
            v-model="trialForm.auditRequired"
            checked-children="需审核"
            un-checked-children="免审"
            :disabled="operating"
          />
          <UiSwitch
            size="sm"
            v-model="trialForm.auditApproved"
            checked-children="已通过"
            un-checked-children="未通过"
            :disabled="operating"
          />
        </div>
        <PortfolioIndicatorTemplateParamsForm
          :rule-type="trialForm.ruleType"
          :params="trialParams"
          :disabled="operating"
          style="margin-top: 12px"
          @update:params="trialParams = $event"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="computing"
          :disabled="operating"
          style="margin-top: 12px"
          @click="runTrial"
        >
          执行试算
        </UiButton>
      </template>
      <template v-else-if="activeTab === 'snapshot'">
        <p class="snapshot-hint">
          审核状态由服务端档案与审核事实决定，正式计分不接受客户端 audit 覆盖。
        </p>
        <div class="form-grid">
          <UiInput
            size="sm"
            v-model="snapshotForm.teacherId"
            placeholder="教师编号"
            :disabled="operating"
          />
          <UiInput
            size="sm"
            v-model="snapshotForm.snapshotId"
            placeholder="快照编号"
            :disabled="operating"
          />
          <UiInput
            size="sm"
            v-model="snapshotForm.indicatorCode"
            placeholder="指标编码"
            :disabled="operating"
          />
          <UiInputNumber
            size="sm"
            v-model="snapshotForm.rawValue"
            placeholder="原始值"
            style="width: 120px"
            :disabled="operating"
          />
        </div>
        <UiButton
          size="sm"
          variant="primary"
          :loading="computing"
          :disabled="operating"
          style="margin-top: 12px"
          @click="runSnapshotCompute"
        >
          正式计分
        </UiButton>
      </template>
      <template v-else-if="activeTab === 'diff'">
        <div class="form-grid">
          <UiInput
            size="sm"
            v-model="diffForm.snapshotIdA"
            placeholder="快照甲编号"
            :disabled="operating"
          />
          <UiInput
            size="sm"
            v-model="diffForm.snapshotIdB"
            placeholder="快照乙编号"
            :disabled="operating"
          />
          <UiButton
            size="sm"
            variant="primary"
            :loading="operationKey.startsWith('export:diff:')"
            :disabled="operating"
            @click="exportSnapshotDiff"
          >
            导出差异表格
          </UiButton>
        </div>
      </template>
      <template v-else-if="activeTab === 'compute-log'">
        <UiEmpty
          size="sm"
          v-if="!loadState.compute && !loadError.compute && computeLogs.length === 0"
          description="暂无计分日志"
        />
        <UiDataTable
          v-model:current="pageQuery.pageNum"
          v-model:page-size="pageQuery.pageSize"
          pagination-mode="server"
          :columns="computeColumns"
          :data-source="computeLogs"
          :loading="loadState.compute"
          :load-error="loadError.compute"
          :total="computeTotal"
          row-key="id"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'explain', label: '解释' }]"
                split
                @action="
                  () => openExplain(record.id, 'SCORE', record.teacherId, record.explainText)
                "
              />
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="activeTab === 'audit-log'">
        <UiEmpty
          size="sm"
          v-if="!loadState.audit && !loadError.audit && auditLogs.length === 0"
          description="暂无配置审计"
        />
        <UiDataTable
          v-model:current="pageQuery.pageNum"
          v-model:page-size="pageQuery.pageSize"
          pagination-mode="server"
          :columns="auditColumns"
          :data-source="auditLogs"
          :loading="loadState.audit"
          :load-error="loadError.audit"
          :total="auditTotal"
          row-key="id"
          @page-change="handlePageChange"
        />
      </template>
      <template v-else-if="activeTab === 'eval-log'">
        <UiEmpty
          size="sm"
          v-if="!loadState.eval && !loadError.eval && evalLogs.length === 0"
          description="暂无资格评估日志"
        />
        <UiDataTable
          v-model:current="pageQuery.pageNum"
          v-model:page-size="pageQuery.pageSize"
          pagination-mode="server"
          :columns="evalColumns"
          :data-source="evalLogs"
          :loading="loadState.eval"
          :load-error="loadError.eval"
          :total="evalTotal"
          row-key="id"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'eligible'">
              <UiTag :tone="record.eligible ? 'green' : 'red'">
                {{ record.eligible ? '通过' : '不通过' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'explain', label: '解释' }]"
                split
                @action="
                  () => openExplain(record.id, 'ELIGIBILITY', record.teacherId, record.explainText)
                "
              />
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else-if="activeTab === 'collect'">
        <div class="form-grid">
          <UiInput
            size="sm"
            v-model="collectTeacherId"
            placeholder="教师 userId"
            :disabled="operating"
          />
          <UiButton
            size="sm"
            variant="primary"
            :loading="operationKey.startsWith('collect:')"
            :disabled="operating"
            @click="runAutoCollect"
          >
            执行自动采集
          </UiButton>
        </div>
        <p v-if="collectSummary" class="collect-summary">
          成功 {{ collectSummary.collectedCount }} · 跳过 {{ collectSummary.skippedCount }}
        </p>
        <UiDataTable
          v-if="collectSummary"
          v-model:current="collectPageNum"
          v-model:page-size="collectPageSize"
          pagination-mode="server"
          :columns="collectColumns"
          :data-source="collectItems"
          :loading="loadState.collect"
          :load-error="loadError.collect"
          :total="collectTotal"
          row-key="indicatorCode"
          style="margin-top: 12px"
          @page-change="handleCollectPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'collected'">
              <UiTag :tone="record.collected ? 'green' : 'gray'">
                {{ record.collected ? '是' : '否' }}
              </UiTag>
            </template>
          </template>
        </UiDataTable>
      </template>
      <template v-else>
        <UiEmpty
          size="sm"
          v-if="!loadState.impact && !loadError.impact && impactReports.length === 0"
          description="暂无影响报告"
        />
        <UiDataTable
          v-model:current="pageQuery.pageNum"
          v-model:page-size="pageQuery.pageSize"
          pagination-mode="server"
          :columns="impactColumns"
          :data-source="impactReports"
          :loading="loadState.impact"
          :load-error="loadError.impact"
          :total="impactTotal"
          row-key="id"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'sceneCode'">
              {{ sceneCodeLabel(record.sceneCode) }}
            </template>
            <template v-else-if="column.key === 'reportStatus'">
              <UiTag :tone="impactReportStatusTone(record.reportStatus)">
                {{ impactReportStatusLabel(record.reportStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[{ key: 'export', label: '导出', disabled: operating }]"
                split
                @action="() => exportImpact(record.id)"
              />
            </template>
          </template>
        </UiDataTable>
      </template>

      <div v-if="computeResult" class="result-panel">
        <p>
          计算分 {{ computeResult.calcScore ?? '—' }} → 最终分 {{ computeResult.finalScore ?? '—' }}
        </p>
        <p v-if="computeResult.finalScore == null">待审核</p>
        <p v-if="computeResult.hitSegment">命中：{{ computeResult.hitSegment }}</p>
        <p>{{ computeResult.explainText }}</p>
        <UiButton size="sm" @click="explainOpen = true"> 结构化解释 </UiButton>
      </div>
    </UiCard>
    <PortfolioIndicatorExplainDrawer
      v-model:open="explainOpen"
      :explain-text="explainText"
      :score-explain="scoreExplain"
      :eligibility-explain="eligibilityExplain"
    />
  </StageWorkbenchShell>
</template>

<style scoped>
.form-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  align-items: center;
}
.result-panel {
  margin-top: 16px;
  padding: 12px;
  background: var(--dp-fill-quaternary);
  border-radius: 4px;
  font-size: 13px;
}
</style>
