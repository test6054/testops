<template>
  <div class="archive-supervision-panel">
    <SignalBand
      variant="tiles"
      :metrics="panelSignalMetrics"
      compact
      class="archive-supervision-panel__top-signal"
    />

    <UiSectionTabs v-model="activeTab" :items="supervisionTabItems" compact />

    <section v-if="activeTab === 'volumes'" class="archive-supervision-panel__section">
      <WorkbenchSurfaceCard flush>
        <template #toolbar>
          <div class="archive-supervision-panel__volume-actions">
            <div class="archive-supervision-panel__problem-filters">
              <a-checkbox v-model:checked="volumeFilterForm.integrityFailedOnly">缺必交项</a-checkbox>
              <a-checkbox v-model:checked="volumeFilterForm.archiveOverdueOnly">归档逾期</a-checkbox>
              <a-checkbox v-model:checked="volumeFilterForm.delaySubmissionOverdueOnly">
                补交逾期
              </a-checkbox>
            </div>
            <UiFilterBar
              v-model="volumeFilter"
              :fields="volumeFilterFields"
              variant="plain"
              show-labels
              search-text="查询"
              @search="loadVolumes"
              @reset="resetVolumeFilter"
            />
          </div>
        </template>
        <UiDataTable
          v-model:current="volumePagination.pageNum"
          v-model:page-size="volumePagination.pageSize"
          :columns="volumeColumns"
          :data-source="volumes"
          :loading="volumeLoading"
          :total="volumePagination.total"
          flat
          row-key="volumeId"
          size="middle"
          class="student-detail-table__data-table"
          @page-change="loadVolumes"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archive'">
              <button type="button" class="link-cell" @click="openDetail(record.volumeId)">
                {{ record.archiveNo }}
              </button>
              <div class="link-cell__sub">{{ record.archiveTitle }}</div>
            </template>
            <template v-else-if="column.key === 'volumeStatus'">
              <UiTag :tone="volumeStatusTone(record.volumeStatus)" size="sm">
                {{ volumeStatusLabel(record.volumeStatus) }}
              </UiTag>
              <UiTag
                v-if="record.hasOpenRemediationTask"
                tone="orange"
                size="sm"
                class="archive-supervision-panel__remediation-tag"
              >
                待整改
              </UiTag>
              <UiTag
                v-if="record.securityMarkPending"
                tone="orange"
                size="sm"
                class="archive-supervision-panel__remediation-tag"
              >
                定密待确认
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="openDetail(record.volumeId)">详情</UiTextAction>
              <UiTextAction @click="openMarkProblem(record.volumeId)">标记问题</UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </section>

    <section v-if="activeTab === 'statistics'" class="archive-supervision-panel__section">
      <WorkbenchSurfaceCard flush>
        <template #head>就绪矩阵</template>
        <template #toolbar>
          <div class="archive-supervision-panel__stats-actions">
            <a-input
              v-model:value="statsFilter.academicYear"
              placeholder="学年 如 2024-2025"
              style="width: 160px"
            />
            <a-select
              v-model:value="statsFilter.semester"
              :options="SemesterOptions"
              placeholder="学期"
              allow-clear
              style="width: 120px"
            />
            <UiButton size="sm" @click="loadReadinessPreview">查询</UiButton>
            <UiButton size="sm" variant="outline" @click="goReadinessMatrix">四学期矩阵</UiButton>
            <UiButton size="sm" variant="outline" @click="goMarkingQuality">阅卷督导</UiButton>
          </div>
        </template>
        <UiSkeletonState v-if="statsLoading" variant="card" compact />
        <template v-else>
          <SignalBand
            v-if="matrixPreviewRows.length"
            variant="tiles"
            :metrics="statsMetrics"
            compact
            class="archive-supervision-panel__signal"
          />
          <UiDataTable
            v-if="matrixPreviewRows.length"
            pagination-mode="none"
            :columns="matrixPreviewColumns"
            :data-source="matrixPreviewRows"
            :show-pagination="false"
            flat
            row-key="rowKey"
            size="small"
            class="archive-supervision-panel__table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'storedRate'">
                <span :class="readinessRateCellClass(record.storedRate)">{{ formatReadinessRate(record.storedRate) }}</span>
              </template>
              <template v-else-if="column.key === 'storedCount'">
                <span class="mono">{{ record.storedCount }}/{{ record.totalVolumeCount }}</span>
              </template>
              <template v-else-if="column.key === 'integrityPassRate'">
                <span :class="readinessRateCellClass(record.integrityPassRate)">{{ formatReadinessRate(record.integrityPassRate) }}</span>
              </template>
              <template v-else-if="column.key === 'fourPropertyPassRate'">
                <span :class="readinessRateCellClass(record.fourPropertyPassRate)">{{ formatReadinessRate(record.fourPropertyPassRate) }}</span>
              </template>
            </template>
          </UiDataTable>
          <UiEmpty
            v-else-if="statsFilter.academicYear && statsFilter.semester"
            description="当前学期暂无就绪度数据"
          />
          <UiEmpty
            v-else
            description="请选择学年学期后查询"
          />
        </template>
      </WorkbenchSurfaceCard>
    </section>

    <section v-else-if="activeTab === 'remediation'" class="archive-supervision-panel__section">
      <WorkbenchSurfaceCard flush>
        <UiDataTable
          pagination-mode="none"
          :columns="remediationColumns"
          :data-source="remediationTasks"
          :loading="remediationLoading"
          :show-pagination="false"
          flat
          row-key="taskId"
          size="middle"
          class="student-detail-table__data-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'taskStatus'">
              <UiTag :tone="remediationStatusTone(record.taskStatus)" size="sm">
                {{ remediationStatusLabel(record.taskStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'assigneeNickName'">
              {{ remediationAssigneeLabel(record) }}
            </template>
            <template v-else-if="column.key === 'diagnosticCode'">
              {{ record.diagnosticCode ? remediationDiagnosticLabel(record.diagnosticCode) : '—' }}
            </template>
            <template v-else-if="column.key === 'volumeId'">
              <UiTextAction @click="goVolumeDetail(record.volumeId, record.diagnosticCode)">
                {{ record.volumeId }}
              </UiTextAction>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="goRemediationTaskDetail(record)">去处理</UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
    </section>

    <section v-else-if="activeTab === 'campaign'" class="archive-supervision-panel__section">
      <WorkbenchSurfaceCard flush>
        <template #toolbar>
          <div class="archive-supervision-panel__campaign-actions">
            <a-select
              v-model:value="exportCampaignId"
              :loading="campaignLoading"
              :options="campaignSelectOptions"
              allow-clear
              placeholder="选择评估批次"
              style="width: 280px"
            />
            <template v-if="isTenantWideCollegeCoordinator">
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!exportCampaignId"
                :loading="exportingManifest"
                @click="handleExportManifest"
              >
                导出 manifest
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!exportCampaignId"
                :loading="exportingArchive"
                @click="handleExportArchive"
              >
                导出四级目录包
              </UiButton>
            </template>
          </div>
        </template>
        <p
          v-if="isTenantWideCollegeCoordinator && exportCampaignId"
          class="archive-supervision-panel__export-hint"
        >
          导出范围：{{ ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT }}
        </p>
        <UiDataTable
          pagination-mode="none"
          :columns="campaignColumns"
          :data-source="campaigns"
          :loading="campaignLoading"
          :show-pagination="false"
          flat
          row-key="campaignId"
          size="middle"
          class="student-detail-table__data-table"
        />
      </WorkbenchSurfaceCard>
    </section>
  </div>

  <UiDrawer
    :open="detailOpen"
    title="归档卷详情（只读）"
    :width="640"
    hide-footer
    @update:open="(v: boolean) => (detailOpen = v)"
    @close="detailOpen = false"
  >
    <UiSkeletonState v-if="detailLoading" variant="card" compact />
    <template v-else-if="detail">
      <div class="detail-head">
        <div class="detail-head__title">{{ detail.volume.archiveTitle }}</div>
        <div class="detail-head__sub">{{ detail.volume.archiveNo }}</div>
      </div>
      <a-descriptions bordered size="small" :column="1" class="detail-desc">
        <a-descriptions-item label="卷状态">
          {{ volumeStatusLabel(detail.volume.volumeStatus) }}
        </a-descriptions-item>
        <a-descriptions-item label="完整性">
          {{ integrityStatusLabel(detail.volume.integrityStatus) }}
        </a-descriptions-item>
        <a-descriptions-item label="来源">
          {{ sourceTypeLabel(detail.volume.sourceType) }}
        </a-descriptions-item>
      </a-descriptions>
      <h4 class="section-title">材料清单</h4>
      <UiDataTable
        pagination-mode="none"
        :columns="materialColumns"
        :data-source="detail.materials"
        :show-pagination="false"
        flat
        row-key="materialId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'tags'">
            <template v-if="record.tags?.length">
              <UiTag v-for="tag in record.tags" :key="tag" tone="gray" size="sm">{{ tag }}</UiTag>
            </template>
            <span v-else>-</span>
          </template>
        </template>
      </UiDataTable>
    </template>
  </UiDrawer>

  <UiDrawer
    :open="markProblemOpen"
    title="标记问题"
    :width="520"
    :confirm-loading="markProblemSubmitting"
    ok-text="提交"
    :hide-footer="false"
    @update:open="(v: boolean) => (markProblemOpen = v)"
    @close="markProblemOpen = false"
    @confirm="submitMarkProblem"
  >
    <a-form layout="vertical">
      <a-form-item label="问题描述" required>
        <a-textarea
          v-model:value="markProblemDescription"
          :rows="4"
          placeholder="描述督导发现的问题"
        />
      </a-form-item>
      <a-form-item label="评估批次">
        <a-select
          v-model:value="markProblemCampaignId"
          allow-clear
          placeholder="可选，关联评估批次"
          :options="campaignSelectOptions"
        />
      </a-form-item>
    </a-form>
  </UiDrawer>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignVO,
  ArchiveIntegrityStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveReadinessMatrixVO,
  ArchiveRemediationTaskVO,
  ArchiveVolumeDetailVO,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeStatusCode,
  ArchiveVolumeVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
  ARCHIVE_VOLUME_STATUS_TONE,
  ArchiveEvaluationCampaignStatusDescription,
  ArchiveIntegrityStatusDescription,
  ArchiveMaterialTypeDescription,
  ArchiveRemediationStatusDescription,
  ArchiveVolumeSourceTypeDescription,
  ArchiveVolumeStatusDescription,
  exportEvaluationArchivePackage,
  exportEvaluationPackage,
  getSupervisionArchiveVolumeDetail,
  getSupervisionReadinessMatrix,
  listSupervisionCampaigns,
  listSupervisionRemediationTasks,
  markSupervisionProblem,
  pageSupervisionArchiveVolumes,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { generateAcademicYearOptions } from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import {
  formatReadinessRate,
  readinessRateCellClass,
} from '@/utils/archive-readiness-matrix-ui'
import {
  remediationDiagnosticLabel,
  remediationVolumeDetailTabKey,
} from '@/utils/archive-remediation-diagnostic'
import { remediationAssigneeLabel } from '@/utils/archive-remediation-display'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeSupervisionPanel' })

const router = useRouter()
const { isTenantWideCollegeCoordinator, loadGrants } = useArchiveDutyAccess()
const activeTab = ref('statistics')
const supervisionTabItems = [
  { key: 'statistics', label: '就绪矩阵' },
  { key: 'volumes', label: '归档卷' },
  { key: 'remediation', label: '整改任务' },
  { key: 'campaign', label: '评估批次' },
]
const volumeLoading = ref(false)
const statsLoading = ref(false)
const remediationLoading = ref(false)
const campaignLoading = ref(false)
const detailLoading = ref(false)
const detailOpen = ref(false)
const markProblemOpen = ref(false)
const markProblemSubmitting = ref(false)
const markProblemVolumeId = ref('')
const markProblemDescription = ref('')
const markProblemCampaignId = ref<string | undefined>(undefined)
const exportCampaignId = ref<string>()
const exportingManifest = ref(false)
const exportingArchive = ref(false)
const volumes = ref<ArchiveVolumeVO[]>([])
const readinessMatrix = ref<ArchiveReadinessMatrixVO | null>(null)
const remediationTasks = ref<ArchiveRemediationTaskVO[]>([])
const campaigns = ref<ArchiveEvaluationCampaignVO[]>([])
const detail = ref<ArchiveVolumeDetailVO | null>(null)

const openRemediationCount = computed(() =>
  remediationTasks.value.filter((item) => item.taskStatus !== 'CLOSED').length,
)

const panelSignalMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'openRemediation',
    label: '待处理整改',
    value: openRemediationCount.value,
    tone: openRemediationCount.value > 0 ? 'orange' : undefined,
  },
  {
    key: 'supervisionVolumes',
    label: '督导归档卷',
    value: volumePagination.total,
  },
])

interface SupervisionVolumeFilterForm extends Record<string, unknown> {
  keyword: string
  academicYear: string | undefined
  semester: SemesterCode | undefined
  volumeStatus: ArchiveVolumeStatusCode | undefined
  integrityFailedOnly: boolean
  archiveOverdueOnly: boolean
  delaySubmissionOverdueOnly: boolean
}

const volumeFilterForm = reactive<SupervisionVolumeFilterForm>({
  keyword: '',
  academicYear: undefined,
  semester: undefined,
  volumeStatus: undefined,
  integrityFailedOnly: false,
  archiveOverdueOnly: false,
  delaySubmissionOverdueOnly: false,
})
const volumeFilter = computed<Record<string, unknown>>({
  get: () => volumeFilterForm,
  set: (value) => {
    Object.assign(volumeFilterForm, value)
  },
})
const volumePagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })
interface SupervisionStatsFilter {
  academicYear: string
  semester: SemesterCode | undefined
}

const statsFilter = reactive<SupervisionStatsFilter>({
  academicYear: '',
  semester: undefined,
})

const volumeFilterFields = computed<FilterField[]>(() => [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '档案号/标题' },
  {
    key: 'academicYear',
    label: '学年',
    type: 'select',
    placeholder: '全部学年',
    options: generateAcademicYearOptions().map((year) => ({ label: year, value: year })),
    allowClear: true,
  },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '全部学期',
    options: SemesterOptions.map((item) => ({
      label: formatSemester(item.value),
      value: item.value,
    })),
    allowClear: true,
    disabled: !volumeFilterForm.academicYear?.trim(),
  },
])

const volumeColumns: ColumnsType<ArchiveVolumeVO> = [
  { title: '归档卷', key: 'archive', dataIndex: 'archiveNo', width: 240 },
  { title: '院系', key: 'departmentName', dataIndex: 'departmentName', width: 140 },
  { title: '状态', key: 'volumeStatus', dataIndex: 'volumeStatus', width: 120 },
  { title: '操作', key: 'actions', width: 140 },
]

interface MatrixPreviewRow {
  rowKey: string
  departmentName: string
  courseName: string
  storedRate: number
  storedCount: number
  totalVolumeCount: number
  integrityPassRate: number
  fourPropertyPassRate: number
}

const matrixPreviewColumns: ColumnsType<MatrixPreviewRow> = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 140 },
  { title: '课程', dataIndex: 'courseName', key: 'courseName', width: 180 },
  { title: '入库率', key: 'storedRate', width: 100 },
  { title: '入库数/总数', key: 'storedCount', width: 120 },
  { title: '完整性通过率', key: 'integrityPassRate', width: 120 },
  { title: '四性通过率', key: 'fourPropertyPassRate', width: 120 },
]

const matrixPreviewRows = computed<MatrixPreviewRow[]>(() => {
  const matrix = readinessMatrix.value
  if (!matrix || matrix.termColumns.length === 0) return []
  const latestTerm = matrix.termColumns[matrix.termColumns.length - 1]
  return matrix.rows.map((row) => {
    const cell = row.cells.find(
      (item) => item.academicYear === latestTerm.academicYear && item.semester === latestTerm.semester,
    )
    return {
      rowKey: `${row.departmentId ?? 'none'}-${row.courseId ?? 'none'}`,
      departmentName: row.departmentName ?? '—',
      courseName: row.courseName ?? '—',
      storedRate: cell?.storedRate ?? 0,
      storedCount: cell?.storedCount ?? 0,
      totalVolumeCount: cell?.totalVolumeCount ?? 0,
      integrityPassRate: cell ? 1 - cell.integrityFailedRate : 0,
      fourPropertyPassRate: cell?.fourPropertyPassedRate ?? 0,
    }
  })
})

const remediationColumns: ColumnsType<ArchiveRemediationTaskVO> = [
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '诊断', key: 'diagnosticCode', width: 140 },
  { title: '卷 ID', dataIndex: 'volumeId', key: 'volumeId', width: 100 },
  { title: '状态', key: 'taskStatus', dataIndex: 'taskStatus', width: 100 },
  { title: '责任人', key: 'assigneeNickName', dataIndex: 'assigneeNickName', width: 120 },
  { title: '操作', key: 'actions', width: 88 },
]

const campaignColumns: ColumnsType<ArchiveEvaluationCampaignVO> = [
  { title: '批次', dataIndex: 'campaignName', key: 'campaignName' },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 120 },
  {
    title: '状态',
    key: 'campaignStatus',
    dataIndex: 'campaignStatus',
    width: 100,
    customRender: ({ record }) =>
      strictEnumLabel(
        ArchiveEvaluationCampaignStatusDescription,
        record.campaignStatus,
        'campaignStatus',
      ),
  },
]

const materialColumns: ColumnsType<ArchiveVolumeDetailVO['materials'][number]> = [
  {
    title: '类型',
    key: 'materialType',
    dataIndex: 'materialType',
    customRender: ({ record }) => materialTypeLabel(record.materialType),
  },
  { title: '目录编码', dataIndex: 'catalogCode', key: 'catalogCode', width: 100 },
  { title: '文件名', dataIndex: 'fileName', key: 'fileName' },
  { title: '标签', key: 'tags', width: 140 },
]

const statsMetrics = computed<SignalMetric[]>(() => {
  if (matrixPreviewRows.value.length === 0) return []
  return [
    { key: 'rows', label: '院系课程', value: matrixPreviewRows.value.length },
    {
      key: 'stored',
      label: '平均入库率',
      value: `${Math.round(
        matrixPreviewRows.value.reduce((sum, row) => sum + row.storedRate, 0)
        / matrixPreviewRows.value.length
        * 100,
      )}%`,
    },
  ]
})

const campaignSelectOptions = computed(() =>
  campaigns.value.map((item) => ({
    value: item.campaignId,
    label: item.campaignName,
  })),
)

function volumeStatusLabel(code: ArchiveVolumeStatusCode) {
  return strictEnumLabel(ArchiveVolumeStatusDescription, code, 'volumeStatus')
}

function volumeStatusTone(code: ArchiveVolumeStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveIntegrityStatusCode) {
  return strictEnumLabel(ArchiveIntegrityStatusDescription, code, 'integrityStatus')
}

function sourceTypeLabel(code: ArchiveVolumeSourceTypeCode) {
  return strictEnumLabel(ArchiveVolumeSourceTypeDescription, code, 'sourceType')
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function remediationStatusLabel(code: ArchiveRemediationTaskVO['taskStatus']) {
  return strictEnumLabel(ArchiveRemediationStatusDescription, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationTaskVO['taskStatus']): BadgeTone {
  if (code === 'CLOSED') return 'gray'
  if (code === 'RESUBMITTED') return 'green'
  if (code === 'IN_PROGRESS') return 'blue'
  return 'orange'
}

function goRemediationTaskDetail(task: ArchiveRemediationTaskVO) {
  void router.push({
    name: 'TeacherArchiveVolumeRemediationDetail',
    params: { taskId: task.taskId },
  })
}

function goVolumeDetail(volumeId: string, diagnosticCode?: ArchiveRemediationDiagnosticCode) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: remediationVolumeDetailTabKey(diagnosticCode) },
  })
}

function goRemediationVolume(task: ArchiveRemediationTaskVO) {
  goRemediationTaskDetail(task)
}

function goReadinessMatrix() {
  void router.push({ name: 'TeacherArchiveVolumeReadinessMatrix' })
}

async function handleExportManifest() {
  if (!exportCampaignId.value) return
  exportingManifest.value = true
  try {
    const result = await exportEvaluationPackage(exportCampaignId.value)
    if (!result.exportFileId) {
      message.error('导出未返回文件 ID')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    message.success(
      `评估 manifest 已导出，共 ${result.volumeCount ?? 0} 卷（${ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT}）`,
    )
  } catch (error) {
    showUserError(error)
  } finally {
    exportingManifest.value = false
  }
}

async function handleExportArchive() {
  if (!exportCampaignId.value) return
  exportingArchive.value = true
  try {
    const result = await exportEvaluationArchivePackage(exportCampaignId.value)
    if (!result.exportFileId) {
      message.error('导出未返回文件 ID')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    message.success(
      `四级目录包已导出，共 ${result.volumeCount ?? 0} 卷（${ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT}）`,
    )
  } catch (error) {
    showUserError(error)
  } finally {
    exportingArchive.value = false
  }
}

async function loadVolumes() {
  if (!ensureAcademicYearSemesterPair(volumeFilterForm.academicYear, volumeFilterForm.semester)) {
    return
  }
  const termQuery = buildOptionalAcademicYearSemesterQuery(
    volumeFilterForm.academicYear,
    volumeFilterForm.semester,
  )
  if (termQuery === null) {
    return
  }
  volumeLoading.value = true
  try {
    const result = await pageSupervisionArchiveVolumes({
      keyword: volumeFilterForm.keyword.trim() || undefined,
      ...termQuery,
      volumeStatus: volumeFilterForm.volumeStatus,
      integrityFailedOnly: volumeFilterForm.integrityFailedOnly || undefined,
      archiveOverdueOnly: volumeFilterForm.archiveOverdueOnly || undefined,
      delaySubmissionOverdueOnly: volumeFilterForm.delaySubmissionOverdueOnly || undefined,
      pageNum: volumePagination.pageNum,
      pageSize: volumePagination.pageSize,
    })
    volumes.value = readPageList(result, '督导归档卷列表异常，请刷新后重试')
    volumePagination.total = readPageTotal(result)
  } catch (error) {
    showUserError(error)
  } finally {
    volumeLoading.value = false
  }
}

function resetVolumeFilter() {
  volumeFilterForm.keyword = ''
  volumeFilterForm.academicYear = undefined
  volumeFilterForm.semester = undefined
  volumeFilterForm.volumeStatus = undefined
  volumeFilterForm.integrityFailedOnly = false
  volumeFilterForm.archiveOverdueOnly = false
  volumeFilterForm.delaySubmissionOverdueOnly = false
  volumePagination.pageNum = 1
  void loadVolumes()
}

async function loadReadinessPreview() {
  if (!ensureAcademicYearSemesterPair(statsFilter.academicYear, statsFilter.semester)) {
    return
  }
  const academicYear = statsFilter.academicYear.trim()
  const semester = statsFilter.semester
  if (!semester) {
    return
  }
  statsLoading.value = true
  try {
    readinessMatrix.value = await getSupervisionReadinessMatrix({
      endAcademicYear: academicYear,
      endSemester: semester,
      termCount: 1,
    })
  } catch (error) {
    readinessMatrix.value = null
    showUserError(error, '加载就绪矩阵失败')
  } finally {
    statsLoading.value = false
  }
}

function goMarkingQuality() {
  void router.push({ name: 'TeacherMarkingOverview' })
}

async function loadRemediation() {
  remediationLoading.value = true
  try {
    remediationTasks.value = await listSupervisionRemediationTasks()
  } catch (error) {
    showUserError(error)
  } finally {
    remediationLoading.value = false
  }
}

async function loadCampaigns() {
  campaignLoading.value = true
  try {
    campaigns.value = await listSupervisionCampaigns()
  } catch (error) {
    showUserError(error)
  } finally {
    campaignLoading.value = false
  }
}

async function openDetail(volumeId: string) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getSupervisionArchiveVolumeDetail(volumeId)
  } catch (error) {
    showUserError(error)
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function openMarkProblem(volumeId: string) {
  markProblemVolumeId.value = volumeId
  markProblemDescription.value = ''
  markProblemCampaignId.value = undefined
  if (campaigns.value.length === 0) {
    void loadCampaigns()
  }
  markProblemOpen.value = true
}

async function submitMarkProblem() {
  const description = markProblemDescription.value.trim()
  if (!description) {
    message.warning('请填写问题描述')
    return
  }
  markProblemSubmitting.value = true
  try {
    await markSupervisionProblem({
      volumeId: markProblemVolumeId.value,
      problemDescription: description,
      campaignId: markProblemCampaignId.value,
    })
    message.success('问题已标记，整改任务已创建')
    markProblemOpen.value = false
    if (activeTab.value === 'remediation') {
      void loadRemediation()
    }
  } catch (error) {
    showUserError(error)
  } finally {
    markProblemSubmitting.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'statistics' && !readinessMatrix.value) void loadReadinessPreview()
  if (tab === 'volumes' && volumes.value.length === 0) void loadVolumes()
  if (tab === 'remediation' && remediationTasks.value.length === 0) void loadRemediation()
  if (tab === 'campaign' && campaigns.value.length === 0) void loadCampaigns()
})

watch(
  () => volumeFilterForm.academicYear,
  (academicYear) => {
    if (!academicYear?.trim()) {
      volumeFilterForm.semester = undefined
    }
  },
)

watch(campaigns, (items) => {
  if (!exportCampaignId.value && items.length > 0) {
    exportCampaignId.value = items[0].campaignId
  }
})

onMounted(() => {
  void loadGrants()
  void loadRemediation()
  void loadVolumes()
})
</script>

<style scoped>
.archive-supervision-panel__top-signal {
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-supervision-panel__section {
  margin-top: var(--dp-space-4, 16px);
}

.archive-supervision-panel__remediation-tag {
  margin-left: var(--dp-space-1, 4px);
}

.archive-supervision-panel__volume-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.archive-supervision-panel__stats-actions,
.archive-supervision-panel__campaign-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.archive-supervision-panel__export-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.archive-supervision-panel__signal {
  margin-bottom: 16px;
}

.archive-supervision-panel__table {
  margin-top: 8px;
}

.link-cell__sub {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}

.detail-head__title {
  font-size: 16px;
  font-weight: 600;
}

.detail-head__sub {
  color: var(--dp-text-muted, #64748b);
  margin-bottom: 12px;
}

.section-title {
  margin: 16px 0 8px;
  font-size: 14px;
}

.archive-supervision-panel__problem-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.link-cell__sub {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}
</style>
