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
              <a-checkbox v-model:checked="volumeFilterForm.integrityFailedOnly">
                缺必交项
              </a-checkbox>
              <a-checkbox v-model:checked="volumeFilterForm.archiveOverdueOnly">
                归档逾期
              </a-checkbox>
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
          pagination-mode="server"
          :columns="volumeColumns"
          :data-source="volumes"
          :loading="volumeLoading"
          :total="volumePagination.total"
          flat
          zebra
          sticky-header
          row-key="volumeId"
          size="middle"
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
              <UiTableActions
                :items="[
                  { key: 'detail', label: '详情' },
                  { key: 'mark', label: '标记问题' },
                ]"
                split
                @action="(key) => handleSupervisionVolumeRowAction(key, record.volumeId)"
              />
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
            <a-select
              v-model:value="statsFilter.academicYearStartYear"
              :options="academicYearStartOptions"
              placeholder="学年起始年"
              allow-clear
              style="width: 140px"
            />
            <a-input
              :value="statsFilter.academicYearEndYear"
              placeholder="结束年"
              disabled
              style="width: 100px"
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
            v-if="matrixPreviewRows.length || previewPagination.total > 0"
            v-model:current="previewPagination.pageNum"
            v-model:page-size="previewPagination.pageSize"
            pagination-mode="server"
            :columns="matrixPreviewColumns"
            :data-source="matrixPreviewRows"
            :loading="statsLoading"
            :total="previewPagination.total"
            flat
            zebra
            sticky-header
            row-key="rowKey"
            size="small"
            class="archive-supervision-panel__table"
            @page-change="loadReadinessPreview"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'storedRate'">
                <span :class="readinessRateCellClass(record.storedRate)">{{
                  formatReadinessRate(record.storedRate)
                }}</span>
              </template>
              <template v-else-if="column.key === 'storedCount'">
                <span class="mono">{{ record.storedCount }}/{{ record.totalVolumeCount }}</span>
              </template>
              <template v-else-if="column.key === 'integrityPassRate'">
                <span :class="readinessRateCellClass(record.integrityPassRate)">{{
                  formatReadinessRate(record.integrityPassRate)
                }}</span>
              </template>
              <template v-else-if="column.key === 'fourPropertyPassRate'">
                <span :class="readinessRateCellClass(record.fourPropertyPassRate)">{{
                  formatReadinessRate(record.fourPropertyPassRate)
                }}</span>
              </template>
            </template>
          </UiDataTable>
          <UiEmpty
            v-else-if="statsFilter.academicYearStartYear != null && statsFilter.semester"
            description="当前学期暂无就绪度数据"
          />
          <UiEmpty v-else description="请选择学年学期后查询" />
        </template>
      </WorkbenchSurfaceCard>
    </section>

    <section v-else-if="activeTab === 'remediation'" class="archive-supervision-panel__section">
      <WorkbenchSurfaceCard flush>
        <UiDataTable
          v-model:current="remediationPagination.pageNum"
          v-model:page-size="remediationPagination.pageSize"
          pagination-mode="server"
          :columns="remediationColumns"
          :data-source="remediationTasks"
          :loading="remediationLoading"
          :total="remediationPagination.total"
          flat
          zebra
          sticky-header
          row-key="taskId"
          size="middle"
          @page-change="loadRemediation"
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
              <UiTableActions
                :items="[{ key: 'handle', label: '去处理' }]"
                split
                @action="() => goRemediationTaskDetail(record)"
              />
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
          v-model:current="campaignPagination.pageNum"
          v-model:page-size="campaignPagination.pageSize"
          pagination-mode="server"
          :columns="campaignColumns"
          :data-source="campaigns"
          :loading="campaignLoading"
          :total="campaignPagination.total"
          flat
          zebra
          sticky-header
          row-key="campaignId"
          size="middle"
          @page-change="loadCampaigns"
        />
      </WorkbenchSurfaceCard>
    </section>
  </div>

  <UiDrawer
    :open="detailOpen"
    title="归档任务详情（只读）"
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
        v-model:current="detailMaterialPagination.pageNum"
        v-model:page-size="detailMaterialPagination.pageSize"
        pagination-mode="server"
        :columns="materialColumns"
        :data-source="detailMaterials"
        :loading="detailMaterialLoading"
        :total="detailMaterialPagination.total"
        flat
        zebra
        sticky-header
        row-key="materialId"
        size="small"
        @page-change="loadDetailMaterials"
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
  ArchiveEvaluationCampaignResponse,
  ArchiveIntegrityStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveReadinessMatrixPreviewRowVO,
  ArchiveReadinessMatrixPreviewStatsVO,
  ArchiveRemediationTaskResponse,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialResponse,
  ArchiveVolumeResponse,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeStatusCode,
} from '@/apis/mark/archive-volume'
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
  getSupervisionReadinessMatrixPreviewStats,
  getSupervisionRemediationStats,
  getSupervisionVolumeStats,
  markSupervisionProblem,
  pageArchiveVolumeMaterials,
  pageSupervisionArchiveVolumes,
  pageSupervisionCampaigns,
  pageSupervisionReadinessMatrixPreview,
  pageSupervisionRemediationTasks,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { generateAcademicYearStartOptions } from '@/utils/academic-year'
import {
  applyAcademicYearStartYearChange,
  buildAcademicYearSemesterTripleFilterFields,
  buildTriplePeriodQuery,
  createAcademicYearSemesterTripleDefaults,
  ensureTriplePeriodPair,
  resolveAcademicYearFromTriple,
} from '@/utils/academic-year-semester-triple-filter'
import { formatReadinessRate, readinessRateCellClass } from '@/utils/archive-readiness-matrix-ui'
import {
  remediationDiagnosticLabel,
  remediationVolumeDetailTabKey,
} from '@/utils/archive-remediation-diagnostic'
import { remediationAssigneeLabel } from '@/utils/archive-remediation-display'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeSupervisionPanel' })

const router = useRouter()
const { isTenantWideCollegeCoordinator, loadGrants } = useArchiveDutyAccess()
const activeTab = ref('statistics')
const supervisionTabItems = [
  { key: 'statistics', label: '就绪矩阵' },
  { key: 'volumes', label: '归档任务' },
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
const volumes = ref<ArchiveVolumeResponse[]>([])
const previewRows = ref<ArchiveReadinessMatrixPreviewRowVO[]>([])
const previewStats = ref<ArchiveReadinessMatrixPreviewStatsVO | null>(null)
const previewPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const remediationTasks = ref<ArchiveRemediationTaskResponse[]>([])
const remediationPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const remediationOpenCount = ref(0)
const supervisionVolumeCount = ref(0)
const campaigns = ref<ArchiveEvaluationCampaignResponse[]>([])
const campaignPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const detail = ref<ArchiveVolumeDetailResponse | null>(null)
const detailMaterials = ref<ArchiveVolumeMaterialResponse[]>([])
const detailMaterialPagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const detailMaterialLoading = ref(false)
const detailVolumeId = ref('')

const panelSignalMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'openRemediation',
    label: '待处理整改',
    value: remediationOpenCount.value,
    tone: remediationOpenCount.value > 0 ? 'orange' : undefined,
  },
  {
    key: 'supervisionVolumes',
    label: '督导归档任务',
    value: supervisionVolumeCount.value,
  },
])

interface SupervisionVolumeFilterForm extends Record<string, unknown> {
  keyword: string
  academicYearStartYear: number | undefined
  academicYearEndYear: number | undefined
  semester: SemesterCode | undefined
  volumeStatus: ArchiveVolumeStatusCode | undefined
  integrityFailedOnly: boolean
  archiveOverdueOnly: boolean
  delaySubmissionOverdueOnly: boolean
}

const volumeFilterForm = reactive<SupervisionVolumeFilterForm>({
  keyword: '',
  ...createAcademicYearSemesterTripleDefaults(false),
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
const volumePagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
interface SupervisionStatsFilter {
  academicYearStartYear: number | undefined
  academicYearEndYear: number | undefined
  semester: SemesterCode | undefined
}

const statsFilter = reactive<SupervisionStatsFilter>({
  ...createAcademicYearSemesterTripleDefaults(true),
})

const academicYearStartOptions = generateAcademicYearStartOptions().map((year) => ({
  label: `${year} 年`,
  value: year,
}))

const volumeFilterFields = computed<FilterField[]>(() => [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '档案号/标题' },
  ...buildAcademicYearSemesterTripleFilterFields(),
])

const volumeColumns: ColumnsType<ArchiveVolumeResponse> = [
  { title: '归档任务', key: 'archive', dataIndex: 'archiveNo', width: 240 },
  { title: '院系', key: 'departmentName', dataIndex: 'departmentName', width: 140 },
  { title: '状态', key: 'volumeStatus', dataIndex: 'volumeStatus', width: 120 },
  { title: '操作', key: 'actions', width: 140 },
]

interface MatrixPreviewRow extends ArchiveReadinessMatrixPreviewRowVO {
  rowKey: string
}

const matrixPreviewRows = computed<MatrixPreviewRow[]>(() =>
  previewRows.value.map((row) => ({
    ...row,
    rowKey: `${row.departmentId ?? 'none'}-${row.courseId ?? 'none'}`,
  })),
)

const matrixPreviewColumns: ColumnsType<MatrixPreviewRow> = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 140 },
  { title: '课程', dataIndex: 'courseName', key: 'courseName', width: 180 },
  { title: '入库率', key: 'storedRate', width: 100 },
  { title: '入库数/总数', key: 'storedCount', width: 120 },
  { title: '完整性通过率', key: 'integrityPassRate', width: 120 },
  { title: '四性通过率', key: 'fourPropertyPassRate', width: 120 },
]

const remediationColumns: ColumnsType<ArchiveRemediationTaskResponse> = [
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '诊断', key: 'diagnosticCode', width: 140 },
  { title: '卷 ID', dataIndex: 'volumeId', key: 'volumeId', width: 100 },
  { title: '状态', key: 'taskStatus', dataIndex: 'taskStatus', width: 100 },
  { title: '责任人', key: 'assigneeNickName', dataIndex: 'assigneeNickName', width: 120 },
  { title: '操作', key: 'actions', width: 88 },
]

const campaignColumns: ColumnsType<ArchiveEvaluationCampaignResponse> = [
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

const materialColumns: ColumnsType<ArchiveVolumeMaterialResponse> = [
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
  const stats = previewStats.value
  if (!stats || stats.rowCount <= 0) return []
  return [
    { key: 'rows', label: '院系课程', value: stats.rowCount },
    {
      key: 'stored',
      label: '平均入库率',
      value: `${Math.round(stats.averageStoredRate * 100)}%`,
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

function remediationStatusLabel(code: ArchiveRemediationTaskResponse['taskStatus']) {
  return strictEnumLabel(ArchiveRemediationStatusDescription, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationTaskResponse['taskStatus']): BadgeTone {
  if (code === 'CLOSED') return 'gray'
  if (code === 'RESUBMITTED') return 'green'
  if (code === 'IN_PROGRESS') return 'blue'
  return 'orange'
}

function goRemediationTaskDetail(task: ArchiveRemediationTaskResponse) {
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

function goRemediationVolume(task: ArchiveRemediationTaskResponse) {
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
  if (!ensureTriplePeriodPair(volumeFilterForm)) {
    return
  }
  const termQuery = buildTriplePeriodQuery(volumeFilterForm)
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
    volumes.value = result.list
    volumePagination.total = result.total
    volumePagination.pageNum = result.pageNum
    volumePagination.pageSize = result.pageSize
  } catch (error) {
    showUserError(error)
  } finally {
    volumeLoading.value = false
  }
}

function resetVolumeFilter() {
  volumeFilterForm.keyword = ''
  volumeFilterForm.academicYearStartYear = undefined
  volumeFilterForm.academicYearEndYear = undefined
  volumeFilterForm.semester = undefined
  volumeFilterForm.volumeStatus = undefined
  volumeFilterForm.integrityFailedOnly = false
  volumeFilterForm.archiveOverdueOnly = false
  volumeFilterForm.delaySubmissionOverdueOnly = false
  volumePagination.pageNum = 1
  void loadVolumes()
}

function goMarkingQuality() {
  void router.push({ name: 'TeacherMarkingOverview' })
}

function buildPreviewRequest() {
  const academicYear = resolveAcademicYearFromTriple(statsFilter)
  const semester = statsFilter.semester
  if (!academicYear || !semester) return null
  return {
    endAcademicYear: academicYear,
    endSemester: semester,
    pageNum: previewPagination.pageNum,
    pageSize: previewPagination.pageSize,
  }
}

async function loadReadinessPreview() {
  if (!ensureTriplePeriodPair(statsFilter)) {
    return
  }
  const request = buildPreviewRequest()
  if (!request) return
  statsLoading.value = true
  try {
    const [stats, page] = await Promise.all([
      getSupervisionReadinessMatrixPreviewStats(request),
      pageSupervisionReadinessMatrixPreview(request),
    ])
    previewStats.value = stats
    previewRows.value = page.list
    previewPagination.total = page.total
    if (page.pageNum != null) previewPagination.pageNum = page.pageNum
    if (page.pageSize != null) previewPagination.pageSize = page.pageSize
  } catch (error) {
    previewStats.value = null
    previewRows.value = []
    previewPagination.total = 0
    showUserError(error, '加载就绪矩阵失败')
  } finally {
    statsLoading.value = false
  }
}

async function loadRemediationStats(): Promise<void> {
  try {
    const stats = await getSupervisionRemediationStats()
    remediationOpenCount.value = stats.openTaskCount
  } catch {
    remediationOpenCount.value = 0
  }
}

async function loadSupervisionVolumeStats(): Promise<void> {
  try {
    const stats = await getSupervisionVolumeStats()
    supervisionVolumeCount.value = stats.supervisionVolumeCount
  } catch {
    supervisionVolumeCount.value = 0
  }
}

async function loadRemediation() {
  remediationLoading.value = true
  try {
    const page = await pageSupervisionRemediationTasks({
      pageNum: remediationPagination.pageNum,
      pageSize: remediationPagination.pageSize,
    })
    remediationTasks.value = page.list
    remediationPagination.total = page.total
    if (page.pageNum != null) remediationPagination.pageNum = page.pageNum
    if (page.pageSize != null) remediationPagination.pageSize = page.pageSize
  } catch (error) {
    showUserError(error)
  } finally {
    remediationLoading.value = false
  }
}

async function loadCampaigns() {
  campaignLoading.value = true
  try {
    const page = await pageSupervisionCampaigns({
      pageNum: campaignPagination.pageNum,
      pageSize: campaignPagination.pageSize,
    })
    campaigns.value = page.list
    campaignPagination.total = page.total
    if (page.pageNum != null) campaignPagination.pageNum = page.pageNum
    if (page.pageSize != null) campaignPagination.pageSize = page.pageSize
  } catch (error) {
    showUserError(error)
  } finally {
    campaignLoading.value = false
  }
}

async function loadDetailMaterials(): Promise<void> {
  if (!detailVolumeId.value) {
    detailMaterials.value = []
    detailMaterialPagination.total = 0
    return
  }
  detailMaterialLoading.value = true
  try {
    const page = await pageArchiveVolumeMaterials({
      volumeId: detailVolumeId.value,
      pageNum: detailMaterialPagination.pageNum,
      pageSize: detailMaterialPagination.pageSize,
    })
    detailMaterials.value = page.list
    detailMaterialPagination.total = page.total
    if (page.pageNum != null) detailMaterialPagination.pageNum = page.pageNum
    if (page.pageSize != null) detailMaterialPagination.pageSize = page.pageSize
  } catch (error) {
    detailMaterials.value = []
    detailMaterialPagination.total = 0
    showUserError(error, '材料清单加载失败')
  } finally {
    detailMaterialLoading.value = false
  }
}

async function openDetail(volumeId: string) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  detailVolumeId.value = volumeId
  detailMaterialPagination.pageNum = 1
  detailMaterials.value = []
  try {
    detail.value = await getSupervisionArchiveVolumeDetail(volumeId)
    await loadDetailMaterials()
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

function handleSupervisionVolumeRowAction(key: string, volumeId: string) {
  if (key === 'detail') void openDetail(volumeId)
  else if (key === 'mark') openMarkProblem(volumeId)
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
      void loadRemediationStats()
    }
  } catch (error) {
    showUserError(error)
  } finally {
    markProblemSubmitting.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'statistics' && previewRows.value.length === 0) void loadReadinessPreview()
  if (tab === 'volumes' && volumes.value.length === 0) void loadVolumes()
  if (tab === 'remediation' && remediationTasks.value.length === 0) void loadRemediation()
  if (tab === 'campaign' && campaigns.value.length === 0) void loadCampaigns()
})

watch(
  () => volumeFilterForm.academicYearStartYear,
  (startYear) => {
    applyAcademicYearStartYearChange(volumeFilterForm, startYear)
  },
)

watch(
  () => statsFilter.academicYearStartYear,
  (startYear) => {
    applyAcademicYearStartYearChange(statsFilter, startYear)
  },
)

watch(campaigns, (items) => {
  if (!exportCampaignId.value && items.length > 0) {
    exportCampaignId.value = items[0].campaignId
  }
})

onMounted(() => {
  void loadGrants()
  void loadRemediationStats()
  void loadSupervisionVolumeStats()
  void loadVolumes()
})
</script>

<style scoped>
.archive-supervision-panel__top-signal {
  margin-bottom: var(--dp-space-3);
}

.archive-supervision-panel__section {
  margin-top: var(--dp-space-4);
}

.archive-supervision-panel__remediation-tag {
  margin-left: var(--dp-space-1);
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

.detail-head__title {
  font-size: 16px;
  font-weight: 600;
}

.detail-head__sub {
  color: var(--dp-text-muted);
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
</style>
