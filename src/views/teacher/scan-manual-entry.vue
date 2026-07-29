<template>
  <StageWorkbenchShell class="scan-manual-entry">
    <template v-if="selectedExamId" #context>
      <ContextBar
        layout="workbench"
        show-title
        title="手动补录"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag
            v-if="workbench"
            :tone="workbench.missingPageCandidateCount == null ? 'orange' : workbench.missingPageCandidateCount > 0 ? 'orange' : 'green'"
            size="sm"
          >
            {{
              workbench.missingPageCandidateCount == null
                ? '页数待推导'
                : workbench.missingPageCandidateCount > 0
                  ? `${workbench.missingPageCandidateCount} 名缺页`
                  : '无缺页考生'
            }}
          </UiTag>
          <UiTag
            v-if="workbench"
            :tone="workbench.webSupplementDeviceCount > 0 ? 'blue' : 'orange'"
            size="sm"
          >
            网页补录工位 {{ workbench.webSupplementDeviceCount }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton size="sm" variant="outline" @click="goScanLedger"> 影像账本 </UiButton>
          <UiButton
            v-if="canManageOwnerSupplementWrites === true"
            size="sm"
            variant="primary"
            @click="openFileImportWizard"
          >
            文件补入
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand
        layout="spotlight"
        compact
        variant="panel"
        :metrics="signalMetrics"
        class="scan-manual-entry__stats"
        @metric-click="handleMetricClick"
      />
    </template>

    <ExamSelectGateStrip
      v-if="!selectedExamId"
      class="scan-manual-entry__empty"
      body="请先选择考试后再办理缺页补录"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="workbenchLoadFailed"
        tone="error"
        title="补录工作台指标加载失败"
        description="缺页统计与补录记录暂不可用。"
        dense
        class="scan-manual-entry__alert"
      />

      <UiAlertStrip
        v-if="examDetailLoadFailed"
        tone="error"
        title="考试详情加载失败"
        description="班级范围合同暂不可用；不得按「未维护班级」解释。"
        dense
        class="scan-manual-entry__alert"
      />

      <UiAlertStrip
        v-if="candidatesLoadFailed && activeTab === 'candidates'"
        tone="error"
        title="待补名单加载失败"
        dense
        class="scan-manual-entry__alert"
      />

      <UiAlertStrip
        v-if="recordsLoadFailed && activeTab === 'records'"
        tone="error"
        title="补录记录加载失败"
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
            :can-manage-owner-writes="canManageOwnerSupplementWrites"
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
            :empty-description="recordEmptyDescription"
            @page-change="handleRecordPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'scanMode'">
                {{ scanModeLabel(record.scanMode) }}
              </template>
              <template v-else-if="column.key === 'student'">
                <span v-if="record.studentNo">{{ record.studentNo }} · {{ record.studentName }}</span>
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
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { Key } from 'ant-design-vue/es/_util/type'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamManualSupplementCandidateItemResponse,
  ExamManualSupplementRecordItemResponse,
  ExamManualSupplementWorkbenchResponse,
} from '@/apis/mark/manual-supplement'
import type {
  ManualSupplementScenario,
  ManualSupplementWizardContext,
} from '@/components/mark/manual-supplement/ManualSupplementWizardDrawer.vue'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { ScannerKioskScanModeCode } from '@/types/enums/scanner-kiosk-scan-mode-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamDetail } from '@/apis/mark/exam'
import {
  getManualSupplementWorkbench,
  pageManualSupplementCandidates,
  pageManualSupplementRecords,
} from '@/apis/mark/manual-supplement'
import ManualSupplementCandidateTable from '@/components/mark/manual-supplement/ManualSupplementCandidateTable.vue'
import ManualSupplementWizardDrawer from '@/components/mark/manual-supplement/ManualSupplementWizardDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { ScannerKioskScanModeDescription } from '@/types/enums/scanner-kiosk-scan-mode-enum'
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
const { selectedExamId, selectedExam } = useMarkExamContext()
const { contextBarSubtitle } = useExamJourneyContextBar('手动补录')

const activeTab = ref<ManualEntryTab>('candidates')
const tabItems = [
  { key: 'candidates', label: '待补名单' },
  { key: 'records', label: '补录记录' },
]

const workbench = ref<ExamManualSupplementWorkbenchResponse | null>(null)
/** MVR-265/324：仅认 BE canManageOwnerSupplementWrites===true；禁止缺省回退 isExamOwner */
const canManageOwnerSupplementWrites = computed(
  () => workbench.value?.canManageOwnerSupplementWrites === true,
)
const workbenchLoadFailed = ref(false)
const examDetailLoadFailed = ref(false)
const candidatesLoadFailed = ref(false)
const recordsLoadFailed = ref(false)
let examLoadGeneration = 0
const classOptions = ref<Array<{ value: string, label: string }>>([])

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

const candidateEmptyDescription = computed(() => {
  if (candidatesLoadFailed.value) {
    return '待补名单加载失败'
  }
  if (workbench.value?.missingPageCandidateCount == null) {
    return '整卷线下试卷尚未形成单卷页数真源，暂不能判定缺页；可查看已扫描卷面并替换污损页'
  }
  if (workbench.value.missingPageCandidateCount === 0) {
    return '当前无缺页考生，可前往影像账本核对'
  }
  return '暂无待补考生'
})

const recordEmptyDescription = computed(() => {
  if (recordsLoadFailed.value) {
    return '补录记录加载失败'
  }
  return '暂无补录记录'
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
    return [{ key: 'load-failed', label: '补录关键指标', value: '加载失败', tone: 'red', emphasis: 'primary' }]
  }
  const data = workbench.value
  if (!data) {
    return [{ key: 'loading', label: '补录关键指标', value: '—', tone: 'gray', emphasis: 'primary' }]
  }
  const missingCount = data.missingPageCandidateCount
  const pool: SignalMetric[] = [
    {
      key: 'missing-page',
      label: '缺页考生',
      value: missingCount == null ? '—' : String(missingCount),
      unit: missingCount == null ? '页数待推导' : '人',
      tone: missingCount == null || missingCount > 0 ? 'orange' : 'green',
      clickable: true,
      emphasis: 'secondary',
      actionLabel: '补录缺页',
      helper: missingCount == null || missingCount > 0 ? '优先补齐缺页考生' : '暂无缺页',
    },
    {
      key: 'attention',
      label: '待处置异常',
      value: String(data.pendingAttentionCount),
      tone: data.pendingAttentionCount > 0 ? 'orange' : 'green',
      clickable: true,
      emphasis: 'secondary',
      actionLabel: data.pendingAttentionCount > 0 ? '处置异常' : undefined,
    },
    {
      key: 'eligible-batch',
      label: '可补扫批次',
      value: String(data.supplementEligibleBatchCount),
      tone: 'blue',
      clickable: true,
      emphasis: 'secondary',
    },
    {
      key: 'web-device',
      label: '网页补录工位',
      value: String(data.webSupplementDeviceCount),
      tone: data.webSupplementDeviceCount > 0 ? 'blue' : 'orange',
      clickable: true,
      emphasis: 'secondary',
    },
  ]
  const primaryBase
    = missingCount == null || missingCount > 0
      ? pool[0]
      : data.pendingAttentionCount > 0
        ? pool[1]
        : pool[2]
  return [
    { ...primaryBase, emphasis: 'primary' },
    ...pool.filter((item) => item.key !== primaryBase.key),
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

async function loadExamContext(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    classOptions.value = []
    examDetailLoadFailed.value = false
    return
  }
  try {
    const detail = await getExamDetail(examId)
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    classOptions.value = (detail.classRefs ?? []).map((item) => ({
      value: item.classId,
      label: item.className || item.classId,
    }))
    examDetailLoadFailed.value = false
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    examDetailLoadFailed.value = true
    showUserError(error, '考试详情加载失败')
  }
}

async function loadWorkbench(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    workbench.value = null
    workbenchLoadFailed.value = false
    return
  }
  const hadWorkbench = workbench.value != null
  try {
    const next = await getManualSupplementWorkbench(examId)
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    workbench.value = next
    workbenchLoadFailed.value = false
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    if (!hadWorkbench) {
      workbench.value = null
    }
    workbenchLoadFailed.value = true
    showUserError(error, '补录工作台加载失败')
  }
}

async function loadCandidates(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    candidates.value = []
    candidatesLoadFailed.value = false
    return
  }
  const hadCandidates = candidates.value.length > 0
  candidatesLoading.value = true
  try {
    const result = await pageManualSupplementCandidates({
      examId,
      pageNum: candidateQuery.pageNum,
      pageSize: candidateQuery.pageSize,
      classId: candidateQuery.classId,
      keyword: candidateQuery.keyword,
    })
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    candidates.value = result.list
    candidateQuery.total = result.total
    candidatesLoadFailed.value = false
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    if (!hadCandidates) {
      candidates.value = []
      candidateQuery.total = 0
    }
    candidatesLoadFailed.value = true
    showUserError(error, '待补名单加载失败')
  } finally {
    if (expectedGeneration === examLoadGeneration && selectedExamId.value === examId) {
      candidatesLoading.value = false
    }
  }
}

async function loadRecords(expectedGeneration = examLoadGeneration): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    records.value = []
    recordsLoadFailed.value = false
    return
  }
  const hadRecords = records.value.length > 0
  recordsLoading.value = true
  try {
    const result = await pageManualSupplementRecords({
      examId,
      pageNum: recordPagination.current,
      pageSize: recordPagination.pageSize,
    })
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    records.value = result.list.map((item, index) => ({
      ...item,
      recordKey: `${item.scanBatchId}-${item.createTime ?? index}`,
    }))
    recordPagination.total = result.total
    recordsLoadFailed.value = false
  } catch (error) {
    if (expectedGeneration !== examLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    if (!hadRecords) {
      records.value = []
      recordPagination.total = 0
    }
    recordsLoadFailed.value = true
    showUserError(error, '补录记录加载失败')
  } finally {
    if (expectedGeneration === examLoadGeneration && selectedExamId.value === examId) {
      recordsLoading.value = false
    }
  }
}

function reloadCandidatesFromFirstPage(): void {
  candidateQuery.pageNum = 1
  candidateQuery.classId = candidateFilterModel.classId
  candidateQuery.keyword = candidateFilterModel.keyword.trim() || undefined
  void loadCandidates(examLoadGeneration)
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

function handleRecordPageChange(pageEvent: { current: number, pageSize: number }): void {
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
  if (canManageOwnerSupplementWrites.value !== true) {
    return
  }
  if (record.supplementEligible !== true) {
    return
  }
  wizardContext.value = buildWizardContext('missing-page', {
    ...record,
    targetPageNo: targetPageNo ?? record.missingTemplatePageNos[0],
  })
  wizardOpen.value = true
}

function openReplaceWizard(record: ExamManualSupplementCandidateItemResponse): void {
  if (canManageOwnerSupplementWrites.value !== true) {
    return
  }
  if (record.replaceEligible !== true) {
    return
  }
  wizardContext.value = buildWizardContext('replace', { ...record, targetPageNo: undefined })
  wizardOpen.value = true
}

function openFileImportWizard(): void {
  if (canManageOwnerSupplementWrites.value !== true) {
    return
  }
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

/**
 * 继续补下一页：同一答卷剩余缺页优先，否则下一待补考生；文件补入仅返回名单。
 */
async function handleContinueNext(): Promise<void> {
  const previous = wizardContext.value
  const scenario = previous?.scenario
  wizardOpen.value = false
  activeTab.value = 'candidates'

  if (!previous || scenario === 'file-import') {
    void loadCandidates()
    return
  }

  const generation = examLoadGeneration
  await loadCandidates(generation)
  if (generation !== examLoadGeneration) {
    return
  }

  const nextTarget = resolveNextSupplementTarget(previous)
  if (!nextTarget) {
    void message.info('待补名单已无下一项，请从列表继续')
    return
  }
  if (nextTarget.kind === 'missing-page') {
    openMissingPageWizard(nextTarget.record, nextTarget.targetPageNo)
    return
  }
  openReplaceWizard(nextTarget.record)
}

type NextSupplementTarget
  = | {
    kind: 'missing-page'
    record: ExamManualSupplementCandidateItemResponse
    targetPageNo: number
  }
  | {
    kind: 'replace'
    record: ExamManualSupplementCandidateItemResponse
  }

function resolveNextSupplementTarget(
  previous: ManualSupplementWizardContext,
): NextSupplementTarget | null {
  const list = candidates.value
  if (previous.scenario === 'missing-page') {
    const samePaper = list.find(
      (item) =>
        item.paperInstanceId
        && item.paperInstanceId === previous.paperInstanceId
        && item.supplementEligible
        && item.missingTemplatePageNos.length > 0,
    )
    if (samePaper) {
      const remaining = samePaper.missingTemplatePageNos.filter(
        (pageNo) => pageNo !== previous.targetPageNo,
      )
      const targetPageNo = remaining[0] ?? samePaper.missingTemplatePageNos[0]
      return { kind: 'missing-page', record: samePaper, targetPageNo }
    }
    const nextCandidate = list.find(
      (item) =>
        item.candidateRosterId !== previous.candidateRosterId
        && item.supplementEligible
        && item.missingTemplatePageNos.length > 0,
    )
    if (!nextCandidate) {
      return null
    }
    return {
      kind: 'missing-page',
      record: nextCandidate,
      targetPageNo: nextCandidate.missingTemplatePageNos[0],
    }
  }

  if (previous.scenario === 'replace') {
    const samePaper = list.find(
      (item) =>
        item.paperInstanceId
        && item.paperInstanceId === previous.paperInstanceId
        && item.replaceEligible,
    )
    if (samePaper) {
      return { kind: 'replace', record: samePaper }
    }
    const nextCandidate = list.find(
      (item) =>
        item.candidateRosterId !== previous.candidateRosterId && item.replaceEligible,
    )
    return nextCandidate ? { kind: 'replace', record: nextCandidate } : null
  }

  return null
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
  // MVR-265：写场景 deep link 非主考不打开向导
  if (canManageOwnerSupplementWrites.value !== true) {
    return
  }
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

async function loadAll(expectedGeneration = examLoadGeneration): Promise<void> {
  await loadExamContext(expectedGeneration)
  if (expectedGeneration !== examLoadGeneration) {
    return
  }
  await loadWorkbench(expectedGeneration)
  if (expectedGeneration !== examLoadGeneration) {
    return
  }
  await loadCandidates(expectedGeneration)
  if (expectedGeneration !== examLoadGeneration) {
    return
  }
  if (activeTab.value === 'records') {
    await loadRecords(expectedGeneration)
  }
}

watch(
  selectedExamId,
  (examId) => {
    const generation = ++examLoadGeneration
    workbenchLoadFailed.value = false
    examDetailLoadFailed.value = false
    candidatesLoadFailed.value = false
    recordsLoadFailed.value = false
    workbench.value = null
    candidates.value = []
    records.value = []
    classOptions.value = []
    if (!examId) {
      return
    }
    void loadAll(generation).then(() => {
      if (generation === examLoadGeneration) {
        applyRouteDeepLink()
      }
    })
  },
  { immediate: true },
)

watch(
  () => route.query,
  () => {
    if (!pendingDeepLink.value) {
      applyRouteDeepLink()
    }
  },
)
</script>

<style lang="scss" scoped>
.scan-manual-entry__empty,
.scan-manual-entry__alert {
  margin-bottom: var(--dp-space-block);
}

.scan-manual-entry__surface {
  margin-top: 0;
}

.scan-manual-entry__table-shell {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.scan-manual-entry__tabs {
  padding: 0 var(--dp-space-block);
}

.scan-manual-entry__muted {
  color: var(--dp-text-secondary);
}
</style>
