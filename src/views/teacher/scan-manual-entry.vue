<template>
  <StageWorkbenchShell class="scan-manual-entry">
    <template v-if="selectedExamId" #context>
      <ContextBar layout="workbench" :subtitle="contextBarSubtitle">
        <template #status>
          <UiTag
            v-if="workbench"
            :tone="workbench.missingPageCandidateCount > 0 ? 'orange' : 'green'"
            size="sm"
          >
            {{
              workbench.missingPageCandidateCount > 0
                ? `${workbench.missingPageCandidateCount} 名缺页`
                : '无缺页考生'
            }}
          </UiTag>
          <UiTag
            v-if="workbench"
            :tone="workbench.webSupplementDeviceCount > 0 ? 'blue' : 'orange'"
            size="sm"
          >
            Web 工位 {{ workbench.webSupplementDeviceCount }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" variant="outline" @click="goScanLedger"> 影像账本 </UiButton>
          <UiButton size="sm" variant="primary" @click="openFileImportWizard"> 文件补入 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand
        variant="tiles"
        compact
        :metrics="signalMetrics"
        class="scan-manual-entry__stats"
        @metric-click="handleMetricClick"
      />
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="未进入考试工作台"
      class="scan-manual-entry__empty"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="workbenchLoadFailed"
        tone="error"
        title="补录工作台指标加载失败"
        description="缺页统计与补录记录暂不可用，请刷新后重试。"
        dense
        class="scan-manual-entry__alert"
      />

      <UiAlertStrip
        v-if="classScopeWarning"
        tone="warning"
        :title="classScopeWarning"
        dense
        class="scan-manual-entry__alert"
      />

      <WorkbenchSurfaceCard flush class="scan-manual-entry__surface">
        <div class="scan-manual-entry__table-shell">
          <UiFilterBar
            v-if="activeTab === 'candidates'"
            v-model="candidateFilterModel"
            :fields="candidateFilterFields"
            variant="plain"
            show-labels
            search-text="查询"
            @search="reloadCandidatesFromFirstPage"
            @reset="resetCandidateFilter"
          />

          <UiSectionTabs
            v-model="activeTab"
            :items="tabItems"
            compact
            class="scan-manual-entry__tabs"
            @change="handleTabChange"
          />

          <ManualSupplementCandidateTable
            v-if="activeTab === 'candidates'"
            v-model:current="candidateQuery.pageNum"
            v-model:page-size="candidateQuery.pageSize"
            :items="candidates"
            :loading="candidatesLoading"
            :total="candidateQuery.total"
            :empty-description="candidateEmptyDescription"
            @page-change="handleCandidatePageChange"
            @supplement-missing="openMissingPageWizard"
            @replace-page="openReplaceWizard"
            @handle-attention="goScanMonitorForAttention"
          />

          <UiDataTable
            v-else
            v-model:current="recordPagination.current"
            v-model:page-size="recordPagination.pageSize"
            pagination-mode="server"
            :columns="recordColumns"
            :data-source="records"
            :loading="recordsLoading"
            :total="recordPagination.total"
            :scroll="{ x: 1080 }"
            row-key="recordKey"
            flat
            empty-kind="first-run"
            empty-description="暂无补录记录"
            @page-change="handleRecordPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'scanMode'">
                {{ scanModeLabel(record.scanMode) }}
              </template>
              <template v-else-if="column.key === 'student'">
                <span v-if="record.studentNo"
                  >{{ record.studentNo }} · {{ record.studentName }}</span
                >
                <span v-else class="scan-manual-entry__muted">—</span>
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ formatDateTime(record.createTime) }}
              </template>
            </template>
          </UiDataTable>
        </div>
      </WorkbenchSurfaceCard>
    </template>

    <ManualSupplementWizardDrawer
      v-model:open="wizardOpen"
      :context="wizardContext"
      @success="handleWizardSuccess"
      @continue-next="handleContinueNext"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamManualSupplementCandidateItemResponse,
  ExamManualSupplementRecordItemResponse,
  ExamManualSupplementWorkbenchResponse,
} from '@/apis/mark/manual-supplement'
import {
  getManualSupplementWorkbench,
  pageManualSupplementCandidates,
  pageManualSupplementRecords,
} from '@/apis/mark/manual-supplement'
import type {
  ManualSupplementScenario,
  ManualSupplementWizardContext,
} from '@/components/mark/manual-supplement/ManualSupplementWizardDrawer.vue'
import ManualSupplementWizardDrawer from '@/components/mark/manual-supplement/ManualSupplementWizardDrawer.vue'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import { ScannerKioskScanModeDescription } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamDetail } from '@/apis/mark/exam'
import ManualSupplementCandidateTable from '@/components/mark/manual-supplement/ManualSupplementCandidateTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanManualEntry' })

type ManualEntryTab = 'candidates' | 'records'

interface RecordRow extends ExamManualSupplementRecordItemResponse {
  recordKey: string
}

const router = useRouter()
const route = useRoute()
const { selectedExamId } = useMarkExamContext()
const { contextBarSubtitle } = useExamJourneyContextBar('手动补录')

const activeTab = ref<ManualEntryTab>('candidates')
const tabItems = [
  { key: 'candidates', label: '待补名单' },
  { key: 'records', label: '补录记录' },
]

const workbench = ref<ExamManualSupplementWorkbenchResponse | null>(null)
const workbenchLoadFailed = ref(false)
const declaredClassIds = ref<string[]>([])
const classOptions = ref<Array<{ value: string; label: string }>>([])

const candidateFilterModel = reactive({
  classId: undefined as string | undefined,
  keyword: '',
})
const candidateQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
  classId: undefined as string | undefined,
  keyword: undefined as string | undefined,
})
const candidates = ref<ExamManualSupplementCandidateItemResponse[]>([])
const candidatesLoading = ref(false)

const recordPagination = reactive({ current: 1, pageSize: 20, total: 0 })
const records = ref<RecordRow[]>([])
const recordsLoading = ref(false)

const wizardOpen = ref(false)
const wizardContext = ref<ManualSupplementWizardContext | null>(null)
const pendingDeepLink = ref(false)

const classScopeWarning = computed(() =>
  declaredClassIds.value.length === 0 ? '请先在考生名册维护考试班级范围' : '',
)

const candidateEmptyDescription = computed(() => {
  if (workbench.value && workbench.value.missingPageCandidateCount === 0) {
    return '当前无缺页考生，可前往影像账本核对'
  }
  return '暂无待补考生'
})

const candidateFilterFields = computed((): FilterField[] => [
  {
    key: 'classId',
    label: '班级',
    type: 'select',
    options: classOptions.value,
    allowSearch: true,
    placeholder: '全部班级',
  },
  {
    key: 'keyword',
    label: '考生',
    type: 'input',
    placeholder: '学号或姓名',
  },
])

const signalMetrics = computed((): SignalMetric[] => {
  if (workbenchLoadFailed.value) {
    return [{ key: 'load-failed', label: '补录 KPI', value: '加载失败', tone: 'red' }]
  }
  const data = workbench.value
  if (!data) {
    return [{ key: 'loading', label: '补录 KPI', value: '—', tone: 'gray' }]
  }
  return [
    {
      key: 'missing-page',
      label: '缺页考生',
      value: String(data.missingPageCandidateCount),
      unit: '人',
      tone: data.missingPageCandidateCount > 0 ? 'orange' : 'green',
      clickable: true,
    },
    {
      key: 'eligible-batch',
      label: '可补扫批次',
      value: String(data.supplementEligibleBatchCount),
      tone: 'blue',
      clickable: true,
    },
    {
      key: 'attention',
      label: '待处置异常',
      value: String(data.pendingAttentionCount),
      tone: data.pendingAttentionCount > 0 ? 'orange' : 'green',
      clickable: true,
    },
    {
      key: 'web-device',
      label: 'Web 工位',
      value: String(data.webSupplementDeviceCount),
      tone: data.webSupplementDeviceCount > 0 ? 'blue' : 'orange',
      clickable: true,
    },
  ]
})

const recordColumns: ColumnType<RecordRow>[] = [
  { title: '模式', key: 'scanMode', width: 80, fixed: 'left' },
  { title: '目标页', dataIndex: 'targetPageNo', key: 'targetPageNo', width: 80, align: 'right' },
  { title: '考生', key: 'student', width: 180 },
  { title: '补扫原因', dataIndex: 'supplementReason', key: 'supplementReason', width: 200 },
  { title: '批次', dataIndex: 'batchNo', key: 'batchNo', width: 120 },
  { title: '提交时间', key: 'createTime', width: 160 },
]

function scanModeLabel(mode: ScannerKioskScanModeCode): string {
  return strictEnumLabel(ScannerKioskScanModeDescription, mode, '扫描模式')
}

function goScanLedger(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanLedger',
    params: { examId: selectedExamId.value },
  })
}

function goScanMonitor(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: selectedExamId.value },
  })
}

function goScanMonitorForAttention(record: ExamManualSupplementCandidateItemResponse): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: selectedExamId.value },
    query: {
      tab: 'abnormal',
      ...(record.paperInstanceId ? { paperInstanceId: record.paperInstanceId } : {}),
    },
  })
}

function goScanDevices(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanDevices',
    params: { examId: selectedExamId.value },
  })
}

function goScanBatches(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanBatches',
    params: { examId: selectedExamId.value },
  })
}

function handleMetricClick(key: string): void {
  if (key === 'missing-page') {
    activeTab.value = 'candidates'
    void reloadCandidatesFromFirstPage()
    return
  }
  if (key === 'eligible-batch') {
    goScanBatches()
    return
  }
  if (key === 'attention') {
    goScanMonitor()
    return
  }
  if (key === 'web-device') {
    goScanDevices()
  }
}

function handleTabChange(tab: Key): void {
  if (tab === 'records') {
    void loadRecords()
  }
}

async function loadExamContext(): Promise<void> {
  if (!selectedExamId.value) {
    declaredClassIds.value = []
    classOptions.value = []
    return
  }
  try {
    const detail = await getExamDetail(selectedExamId.value)
    declaredClassIds.value = (detail.classRefs ?? []).map((item) => item.classId)
    classOptions.value = (detail.classRefs ?? []).map((item) => ({
      value: item.classId,
      label: item.className || item.classId,
    }))
  } catch (error) {
    declaredClassIds.value = []
    classOptions.value = []
    showUserError(error, '考试详情加载失败')
  }
}

async function loadWorkbench(): Promise<void> {
  if (!selectedExamId.value) {
    workbench.value = null
    return
  }
  workbenchLoadFailed.value = false
  try {
    workbench.value = await getManualSupplementWorkbench(selectedExamId.value)
  } catch (error) {
    workbench.value = null
    workbenchLoadFailed.value = true
    showUserError(error, '补录工作台加载失败')
  }
}

async function loadCandidates(): Promise<void> {
  if (!selectedExamId.value) {
    candidates.value = []
    return
  }
  candidatesLoading.value = true
  try {
    const result = await pageManualSupplementCandidates({
      examId: selectedExamId.value,
      pageNum: candidateQuery.pageNum,
      pageSize: candidateQuery.pageSize,
      classId: candidateQuery.classId,
      keyword: candidateQuery.keyword,
    })
    candidates.value = result.list
    candidateQuery.total = result.total
  } catch (error) {
    candidates.value = []
    showUserError(error, '待补名单加载失败')
  } finally {
    candidatesLoading.value = false
  }
}

async function loadRecords(): Promise<void> {
  if (!selectedExamId.value) {
    records.value = []
    return
  }
  recordsLoading.value = true
  try {
    const result = await pageManualSupplementRecords({
      examId: selectedExamId.value,
      pageNum: recordPagination.current,
      pageSize: recordPagination.pageSize,
    })
    records.value = result.list.map((item, index) => ({
      ...item,
      recordKey: `${item.scanBatchId}-${item.createTime ?? index}`,
    }))
    recordPagination.total = result.total
  } catch (error) {
    records.value = []
    showUserError(error, '补录记录加载失败')
  } finally {
    recordsLoading.value = false
  }
}

function reloadCandidatesFromFirstPage(): void {
  candidateQuery.pageNum = 1
  candidateQuery.classId = candidateFilterModel.classId
  candidateQuery.keyword = candidateFilterModel.keyword.trim() || undefined
  void loadCandidates()
}

function resetCandidateFilter(): void {
  candidateFilterModel.classId = undefined
  candidateFilterModel.keyword = ''
  reloadCandidatesFromFirstPage()
}

function handleCandidatePageChange(pageNum: number, pageSize: number): void {
  candidateQuery.pageNum = pageNum
  candidateQuery.pageSize = pageSize
  void loadCandidates()
}

function handleRecordPageChange(pageEvent: { current: number; pageSize: number }): void {
  recordPagination.current = pageEvent.current
  recordPagination.pageSize = pageEvent.pageSize
  void loadRecords()
}

function buildWizardContext(
  scenario: ManualSupplementScenario,
  record: Partial<ExamManualSupplementCandidateItemResponse> & {
    targetPageNo?: number
  },
): ManualSupplementWizardContext {
  return {
    scenario,
    examId: selectedExamId.value!,
    paperInstanceId: record.paperInstanceId,
    scanBatchId: record.scanBatchId,
    targetPageNo: record.targetPageNo,
    candidateRosterId: record.candidateRosterId,
    studentNo: record.studentNo,
    studentName: record.studentName,
    className: record.className,
    missingTemplatePageNos: record.missingTemplatePageNos,
    blockReason: record.blockReason,
    replaceBlockReason: record.replaceBlockReason,
    supplementEligible: record.supplementEligible,
    replaceEligible: record.replaceEligible,
  }
}

function openMissingPageWizard(
  record: ExamManualSupplementCandidateItemResponse,
  targetPageNo?: number,
): void {
  if (!record.supplementEligible) {
    return
  }
  wizardContext.value = buildWizardContext('missing-page', {
    ...record,
    targetPageNo: targetPageNo ?? record.missingTemplatePageNos[0],
  })
  wizardOpen.value = true
}

function openReplaceWizard(record: ExamManualSupplementCandidateItemResponse): void {
  if (!record.replaceEligible) {
    return
  }
  wizardContext.value = buildWizardContext('replace', { ...record, targetPageNo: undefined })
  wizardOpen.value = true
}

function openFileImportWizard(): void {
  if (!selectedExamId.value) return
  wizardContext.value = {
    scenario: 'file-import',
    examId: selectedExamId.value,
  }
  wizardOpen.value = true
}

function handleWizardSuccess(): void {
  void loadWorkbench()
  void loadCandidates()
  if (activeTab.value === 'records') {
    void loadRecords()
  }
}

function handleContinueNext(): void {
  wizardOpen.value = false
  activeTab.value = 'candidates'
  void loadCandidates()
}

function parseScenario(value: unknown): ManualSupplementScenario | null {
  if (value === 'missing-page' || value === 'replace' || value === 'file-import') {
    return value
  }
  return null
}

function applyRouteDeepLink(): void {
  const scenario = parseScenario(route.query.scenario)
  if (!scenario || !selectedExamId.value) return
  pendingDeepLink.value = true
  if (scenario === 'file-import') {
    wizardContext.value = { scenario, examId: selectedExamId.value }
    wizardOpen.value = true
    pendingDeepLink.value = false
    return
  }
  const targetPageNo = route.query.targetPageNo ? Number(route.query.targetPageNo) : undefined
  wizardContext.value = {
    scenario,
    examId: selectedExamId.value,
    paperInstanceId:
      typeof route.query.paperInstanceId === 'string' ? route.query.paperInstanceId : undefined,
    scanBatchId: typeof route.query.scanBatchId === 'string' ? route.query.scanBatchId : undefined,
    candidateRosterId:
      typeof route.query.candidateRosterId === 'string' ? route.query.candidateRosterId : undefined,
    targetPageNo: Number.isFinite(targetPageNo) ? targetPageNo : undefined,
  }
  wizardOpen.value = true
  pendingDeepLink.value = false
}

async function loadAll(): Promise<void> {
  await loadExamContext()
  await loadWorkbench()
  await loadCandidates()
}

watch(selectedExamId, () => {
  void loadAll()
})

watch(
  () => route.query,
  () => {
    if (!pendingDeepLink.value) {
      applyRouteDeepLink()
    }
  },
)

onMounted(() => {
  void loadAll().then(() => applyRouteDeepLink())
})
</script>

<style lang="scss" scoped>
.scan-manual-entry__empty,
.scan-manual-entry__alert {
  margin-bottom: 16px;
}

.scan-manual-entry__surface {
  margin-top: 0;
}

.scan-manual-entry__table-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scan-manual-entry__tabs {
  padding: 0 16px;
}

.scan-manual-entry__muted {
  color: var(--ant-color-text-secondary);
}
</style>
