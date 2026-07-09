<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PfImpactReportStatusCode,
  PfSceneCode,
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
import { defaultTemplateParams, serializeTemplateParams } from '@/utils/indicator-template-params'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import PortfolioIndicatorExplainDrawer from '@/components/portfolio/PortfolioIndicatorExplainDrawer.vue'
import PortfolioIndicatorTemplateParamsForm from '@/components/portfolio/PortfolioIndicatorTemplateParamsForm.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
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
const route = useRoute()
const loading = ref(false)
const computing = ref(false)
const computeResult = ref<PortfolioIndicatorScoreComputeResult | null>(null)
const explainOpen = ref(false)
const explainText = ref('')
const explainStructJson = ref('')

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
const collectSummary = ref<PortfolioIndicatorAutoCollectSummaryResponse | null>(null)
const collectItems = ref<PortfolioIndicatorCollectedValueVO[]>([])
const collectTotal = ref(0)
const collectPageNum = ref(1)
const collectPageSize = ref(DEFAULT_LIST_PAGE_SIZE)
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
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: '操作', key: 'actions', width: 80 },
]

function showComputeResult(result: PortfolioIndicatorScoreComputeResult) {
  computeResult.value = result
  explainText.value = result.explainText
  explainStructJson.value = result.explainStructJson
}

async function runTrial() {
  computing.value = true
  try {
    const result = await portfolioIndicatorTenantApi.computeTrial({
      ...trialForm,
      paramsJson: serializeTemplateParams(trialParams.value),
    })
    showComputeResult(result)
    message.success(
      result.finalScore != null ? `试算得分 ${result.finalScore}` : '试算完成，待审核',
    )
  } catch (error) {
    showUserError(error)
  } finally {
    computing.value = false
  }
}

async function runSnapshotCompute() {
  computing.value = true
  try {
    const result = await portfolioIndicatorTenantApi.computeSnapshot({ ...snapshotForm })
    showComputeResult(result)
    message.success(
      result.finalScore != null ? `正式计分 ${result.finalScore}` : '计分完成，待审核',
    )
    await loadComputeLogs()
  } catch (error) {
    showUserError(error)
  } finally {
    computing.value = false
  }
}

async function loadComputeLogs() {
  loading.value = true
  try {
    const page = await portfolioIndicatorTenantApi.pageComputeLog(pageQuery)
    computeLogs.value = page.list
    computeTotal.value = page.total
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadAuditLogs() {
  loading.value = true
  try {
    const page = await portfolioIndicatorTenantApi.pageAuditLog(pageQuery)
    auditLogs.value = page.list
    auditTotal.value = page.total
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadEvalLogs() {
  loading.value = true
  try {
    const page = await portfolioIndicatorTenantApi.pageEvalLog(pageQuery)
    evalLogs.value = page.list
    evalTotal.value = page.total
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadImpactReports() {
  loading.value = true
  try {
    const page = await portfolioIndicatorTenantApi.pageImpactReport(pageQuery)
    impactReports.value = page.list
    impactTotal.value = page.total
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function openExplain(
  logId: string,
  logType: 'SCORE' | 'ELIGIBILITY',
  teacherId: string,
  text?: string,
) {
  explainText.value = text ?? ''
  explainStructJson.value = ''
  try {
    explainStructJson.value = await portfolioIndicatorTenantApi.getExplain({
      logId,
      logType,
      teacherId,
    })
    explainOpen.value = true
  } catch (error) {
    showUserError(error)
  }
}

async function exportSnapshotDiff() {
  if (!diffForm.snapshotIdA || !diffForm.snapshotIdB) {
    message.warning('请填写两个快照 ID')
    return
  }
  try {
    const result = await portfolioIndicatorTenantApi.exportSnapshotDiff({
      snapshotIdA: diffForm.snapshotIdA,
      snapshotIdB: diffForm.snapshotIdB,
    })
    await downloadPortfolioIndicatorExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条差异`)
  } catch (error) {
    showUserError(error)
  }
}

async function exportImpact(id: string) {
  try {
    const result = await portfolioIndicatorTenantApi.exportImpactReport({ id })
    await downloadPortfolioIndicatorExcelExport(result)
    message.success('影响报告已导出')
  } catch (error) {
    showUserError(error)
  }
}

async function runAutoCollect() {
  if (!collectTeacherId.value.trim()) {
    message.warning('请填写教师 ID')
    return
  }
  loading.value = true
  try {
    collectSummary.value = await portfolioIndicatorTenantApi.getAutoCollectSummary({
      teacherId: collectTeacherId.value.trim(),
    })
    collectPageNum.value = 1
    await loadCollectPage()
    message.success(
      `采集 ${collectSummary.value.collectedCount} 条，跳过 ${collectSummary.value.skippedCount} 条`,
    )
  } catch (error) {
    collectSummary.value = null
    collectItems.value = []
    collectTotal.value = 0
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadCollectPage() {
  if (!collectTeacherId.value.trim() || !collectSummary.value) {
    collectItems.value = []
    collectTotal.value = 0
    return
  }
  loading.value = true
  try {
    const result = await portfolioIndicatorTenantApi.pageAutoCollectItems({
      teacherId: collectTeacherId.value.trim(),
      pageNum: collectPageNum.value,
      pageSize: collectPageSize.value,
    })
    collectItems.value = result.list
    collectTotal.value = result.total
  } catch (error) {
    collectItems.value = []
    collectTotal.value = 0
    showUserError(error)
  } finally {
    loading.value = false
  }
}

function handleCollectPageChange(event: { current: number; pageSize: number }) {
  collectPageNum.value = event.current
  collectPageSize.value = event.pageSize
  void loadCollectPage()
}

function onTabChange(key: string | number) {
  activeTab.value = String(key)
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

onMounted(() => {
  const snapshotId = route.query.snapshotId
  if (typeof snapshotId === 'string' && snapshotId) {
    snapshotForm.snapshotId = snapshotId
    activeTab.value = 'snapshot'
  }
  loadComputeLogs()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="指标计分与审计" />
    </template>
    <UiCard>
      <a-tabs :active-key="activeTab" @change="onTabChange">
        <a-tab-pane key="trial" tab="规则试算">
          <div class="form-grid">
            <a-select
              v-model:value="trialForm.ruleType"
              :options="PF_SCORE_RULE_TYPE_OPTIONS"
              placeholder="规则类型"
              style="width: 160px"
            />
            <a-input v-model:value="trialForm.indicatorCode" placeholder="指标编码" />
            <a-input-number
              v-model:value="trialForm.rawValue"
              placeholder="原始值"
              style="width: 120px"
            />
            <a-switch
              v-model:checked="trialForm.auditRequired"
              checked-children="需审核"
              un-checked-children="免审"
            />
            <a-switch
              v-model:checked="trialForm.auditApproved"
              checked-children="已通过"
              un-checked-children="未通过"
            />
          </div>
          <PortfolioIndicatorTemplateParamsForm
            :rule-type="trialForm.ruleType"
            :params="trialParams"
            style="margin-top: 12px"
            @update:params="trialParams = $event"
          />
          <UiButton
            variant="primary"
            :loading="computing"
            style="margin-top: 12px"
            @click="runTrial"
          >
            执行试算
          </UiButton>
        </a-tab-pane>
        <a-tab-pane key="snapshot" tab="快照计分">
          <p class="snapshot-hint">
            审核状态由服务端档案与审核事实决定，正式计分不接受客户端 audit 覆盖。
          </p>
          <div class="form-grid">
            <a-input v-model:value="snapshotForm.teacherId" placeholder="教师 ID" />
            <a-input v-model:value="snapshotForm.snapshotId" placeholder="快照 ID" />
            <a-input v-model:value="snapshotForm.indicatorCode" placeholder="指标编码" />
            <a-input-number
              v-model:value="snapshotForm.rawValue"
              placeholder="原始值"
              style="width: 120px"
            />
          </div>
          <UiButton
            variant="primary"
            :loading="computing"
            style="margin-top: 12px"
            @click="runSnapshotCompute"
          >
            正式计分
          </UiButton>
        </a-tab-pane>
        <a-tab-pane key="diff" tab="快照对比">
          <div class="form-grid">
            <a-input v-model:value="diffForm.snapshotIdA" placeholder="快照 A ID" />
            <a-input v-model:value="diffForm.snapshotIdB" placeholder="快照 B ID" />
            <UiButton @click="exportSnapshotDiff"> 导出差异 CSV </UiButton>
          </div>
        </a-tab-pane>
        <a-tab-pane key="compute-log" tab="计分日志">
          <UiEmpty v-if="!loading && computeLogs.length === 0" description="当前筛选无运维任务" />
          <UiDataTable
            v-model:current="pageQuery.pageNum"
            v-model:page-size="pageQuery.pageSize"
            pagination-mode="server"
            :columns="computeColumns"
            :data-source="computeLogs"
            :loading="loading"
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
        </a-tab-pane>
        <a-tab-pane key="audit-log" tab="配置审计">
          <UiEmpty v-if="!loading && auditLogs.length === 0" description="当前筛选无运维任务" />
          <UiDataTable
            v-model:current="pageQuery.pageNum"
            v-model:page-size="pageQuery.pageSize"
            pagination-mode="server"
            :columns="auditColumns"
            :data-source="auditLogs"
            :loading="loading"
            :total="auditTotal"
            row-key="id"
            @page-change="handlePageChange"
          />
        </a-tab-pane>
        <a-tab-pane key="eval-log" tab="资格评估日志">
          <UiEmpty v-if="!loading && evalLogs.length === 0" description="当前筛选无运维任务" />
          <UiDataTable
            v-model:current="pageQuery.pageNum"
            v-model:page-size="pageQuery.pageSize"
            pagination-mode="server"
            :columns="evalColumns"
            :data-source="evalLogs"
            :loading="loading"
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
                    () =>
                      openExplain(record.id, 'ELIGIBILITY', record.teacherId, record.explainText)
                  "
                />
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="collect" tab="来源采集">
          <div class="form-grid">
            <a-input v-model:value="collectTeacherId" placeholder="教师 userId" />
            <UiButton variant="primary" :loading="loading" @click="runAutoCollect">
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
            :loading="loading"
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
        </a-tab-pane>
        <a-tab-pane key="impact" tab="影响报告">
          <UiEmpty v-if="!loading && impactReports.length === 0" description="当前筛选无运维任务" />
          <UiDataTable
            v-model:current="pageQuery.pageNum"
            v-model:page-size="pageQuery.pageSize"
            pagination-mode="server"
            :columns="impactColumns"
            :data-source="impactReports"
            :loading="loading"
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
                  :items="[{ key: 'export', label: '导出' }]"
                  split
                  @action="() => exportImpact(record.id)"
                />
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
      </a-tabs>
      <div v-if="computeResult" class="result-panel">
        <p>
          计算分 {{ computeResult.calcScore ?? '—' }} → 最终分 {{ computeResult.finalScore ?? '—' }}
        </p>
        <p v-if="computeResult.finalScore == null">待审核</p>
        <p v-if="computeResult.hitSegment">命中：{{ computeResult.hitSegment }}</p>
        <p>{{ computeResult.explainText }}</p>
        <UiButton @click="explainOpen = true"> 结构化解释 </UiButton>
      </div>
    </UiCard>
    <PortfolioIndicatorExplainDrawer
      v-model:open="explainOpen"
      :explain-text="explainText"
      :explain-struct-json="explainStructJson"
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
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
  font-size: 13px;
}
</style>
