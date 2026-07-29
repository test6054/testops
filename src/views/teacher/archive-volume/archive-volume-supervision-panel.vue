<template>
  <div class="archive-supervision-panel">
    <SignalBand
      layout="spotlight"
      :metrics="panelSignalMetrics"
      variant="panel"
      class="archive-supervision-panel__top-signal"
    />
    <UiAlertStrip
      v-if="summaryStatsLoadFailed"
      tone="warning"
      title="督导概览计数加载失败"
    />

    <UiSectionTabs v-model="activeTab" :items="supervisionTabItems" compact />

    <section v-if="activeTab === 'volumes'" class="archive-supervision-panel__section">
      <WorkbenchSurfaceCard flush>
        <template #toolbar>
          <div class="archive-supervision-panel__volume-actions">
            <div class="archive-supervision-panel__problem-filters">
              <UiCheckbox v-model="volumeFilterForm.integrityFailedOnly"> 缺必交项 </UiCheckbox>
              <UiCheckbox v-model="volumeFilterForm.archiveOverdueOnly"> 归档逾期 </UiCheckbox>
              <UiCheckbox v-model="volumeFilterForm.delaySubmissionOverdueOnly">
                补交逾期
              </UiCheckbox>
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
          :data-source="volumeLoadFailed ? [] : volumes"
          :loading="volumeLoading"
          :total="volumePagination.total"
          flat
          zebra
          sticky-header
          row-key="volumeId"
          size="middle"
          :load-error="volumeLoadFailed"
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
                v-if="record.hasOpenRemediationTask === true"
                tone="orange"
                size="sm"
                class="archive-supervision-panel__remediation-tag"
              >
                待整改
              </UiTag>
              <UiTag
                v-if="record.securityMarkPending === true"
                tone="orange"
                size="sm"
                class="archive-supervision-panel__remediation-tag"
              >
                定密待确认
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :max-visible="2"
                :items="supervisionVolumeRowActions(record)"
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
            <UiSelect
              size="sm"
              v-model="statsFilter.academicYearStartYear"
              :options="academicYearStartOptions"
              placeholder="学年起始年"
              allow-clear
              style="width: 140px"
            />
            <UiInput
              size="sm"
              :value="statsFilter.academicYearEndYear"
              placeholder="结束年"
              disabled
              style="width: 100px"
            />
            <UiSelect
              size="sm"
              v-model="statsFilter.semester"
              :options="SemesterOptions"
              placeholder="学期"
              allow-clear
              style="width: 120px"
            />
            <UiButton size="sm" variant="primary" @click="queryReadinessPreview">查询</UiButton>
            <UiButton size="sm" variant="outline" @click="goReadinessMatrix">四学期矩阵</UiButton>
            <UiButton size="sm" variant="outline" @click="goMarkingQuality">阅卷督导</UiButton>
          </div>
        </template>
        <UiSkeletonState v-if="statsLoading" variant="card" compact />
        <UiEmpty
          size="sm"
          v-else-if="statsLoadFailed"
          description="就绪矩阵加载失败"
        />
        <template v-else>
          <SignalBand
            layout="spotlight"
            v-if="matrixPreviewRows.length"
            :metrics="statsMetrics"
            variant="inline"
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
            size="sm"
            v-else-if="statsFilter.academicYearStartYear != null && statsFilter.semester"
            description="当前学期暂无就绪度数据"
          />
          <UiAlertStrip v-else tone="info" size="sm" dense inline :show-icon="false">
            <template #default>
              <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
                <UiTag tone="blue" size="sm">未选择学期</UiTag>
                <span>请选择学年学期后查询就绪度</span>
              </span>
            </template>
          </UiAlertStrip>
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
          :data-source="remediationLoadFailed ? [] : remediationTasks"
          :loading="remediationLoading"
          :total="remediationPagination.total"
          flat
          zebra
          sticky-header
          row-key="taskId"
          size="middle"
          :load-error="remediationLoadFailed"
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
                :max-visible="2"
                :items="[{ key: 'handle', label: '查看整改' }]"
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
            <UiSelect
              size="sm"
              v-model="exportCampaignId"
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
          :data-source="campaignLoadFailed ? [] : campaigns"
          :loading="campaignLoading"
          :total="campaignPagination.total"
          flat
          zebra
          sticky-header
          row-key="campaignId"
          size="middle"
          :load-error="campaignLoadFailed"
          @page-change="loadCampaigns"
        >
        </UiDataTable>
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
      <UiDescriptions bordered size="small" :column="1" class="detail-desc">
        <UiDescriptionsItem label="卷状态">
          {{ volumeStatusLabel(detail.volume.volumeStatus) }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="完整性">
          {{ integrityStatusLabel(detail.volume.integrityStatus) }}
        </UiDescriptionsItem>
        <UiDescriptionsItem label="来源">
          {{ sourceTypeLabel(detail.volume.sourceType) }}
        </UiDescriptionsItem>
      </UiDescriptions>
      <h4 class="section-title">材料清单</h4>
      <UiDataTable
        v-model:current="detailMaterialPagination.pageNum"
        v-model:page-size="detailMaterialPagination.pageSize"
        pagination-mode="server"
        :columns="materialColumns"
        :data-source="detailMaterialLoadFailed ? [] : detailMaterials"
        :loading="detailMaterialLoading"
        :total="detailMaterialPagination.total"
        flat
        zebra
        sticky-header
        row-key="materialId"
        size="small"
        :load-error="detailMaterialLoadFailed"
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
    :confirm-loading="markProblemSubmitting === true"
    ok-text="提交"
    :hide-footer="false"
    @update:open="(v: boolean) => (markProblemOpen = v)"
    @close="markProblemOpen = false"
    @confirm="submitMarkProblem"
  >
    <UiForm layout="vertical">
      <UiFormItem label="问题描述" required>
        <UiTextarea
          size="sm"
          v-model="markProblemDescription"
          :rows="4"
          :maxlength="2000"
          :show-count="true"
          placeholder="描述督导发现的问题"
        />
      </UiFormItem>
      <UiFormItem label="评估批次">
        <UiSelect
          size="sm"
          v-model="markProblemCampaignId"
          allow-clear
          placeholder="可选，关联评估批次"
          :options="campaignSelectOptions"
        />
      </UiFormItem>
    </UiForm>
  </UiDrawer>
  <ArchiveEvaluationExportTaskModal />
</template>

<script setup lang="ts">
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
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
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { ArchiveRemediationDiagnosticCode } from '@/types/enums/archive-remediation-diagnostic-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
  ARCHIVE_VOLUME_STATUS_TONE,
  ArchiveEvaluationCampaignStatusCode,
  ArchiveEvaluationCampaignStatusDescription,
  ArchiveIntegrityStatusDescription,
  ArchiveMaterialTypeDescription,
  ArchiveRemediationStatusDescription,
  ArchiveVolumeSourceTypeDescription,
  ArchiveVolumeStatusCode,
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
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { runArchiveEvaluationExportFlow } from '@/composables/useArchiveEvaluationExportFlow'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { ArchiveTransferStatusCode } from '@/types/enums/archive-transfer-status-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { generateAcademicYearStartOptions } from '@/utils/academic-year'
import {
  applyAcademicYearStartYearChange,
  applyTripleSemesterChange,
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
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveEvaluationExportTaskModal from '@/views/teacher/archive-volume/components/ArchiveEvaluationExportTaskModal.vue'

defineOptions({ name: 'ArchiveVolumeSupervisionPanel' })

const router = useRouter()
const { isTenantWideCollegeCoordinator, canViewSupervision, loadGrants } = useArchiveDutyAccess()
const activeTab = ref('statistics')
/** MVR-353：标记问题叠状态/移交待验收/开放整改互斥，与 BE markSupervisionProblem 同源 */
function canMarkSupervisionProblemOnVolume(record: ArchiveVolumeResponse): boolean {
  if (canViewSupervision.value !== true) {
    return false
  }
  if (record.hasOpenRemediationTask === true) {
    return false
  }
  const status = record.volumeStatus
  if (
    status !== ArchiveVolumeStatusCode.COLLECTING
    && status !== ArchiveVolumeStatusCode.SUBMITTED
    && status !== ArchiveVolumeStatusCode.STORED
  ) {
    return false
  }
  return !(
    status === ArchiveVolumeStatusCode.SUBMITTED
    && record.transferStatus === ArchiveTransferStatusCode.PENDING_REVIEW
  )
}

function supervisionVolumeRowActions(
  record: ArchiveVolumeResponse,
): Array<{ key: string, label: string }> {
  const items: Array<{ key: string, label: string }> = [{ key: 'detail', label: '详情' }]
  if (canMarkSupervisionProblemOnVolume(record)) {
    items.push({ key: 'mark', label: '标记问题' })
  }
  return items
}

const supervisionTabItems = [
  { key: 'statistics', label: '就绪矩阵' },
  { key: 'volumes', label: '归档任务' },
  { key: 'remediation', label: '整改任务' },
  { key: 'campaign', label: '评估批次' },
]
const volumeLoading = ref(false)
const volumeLoadFailed = ref(false)
const statsLoading = ref(false)
const statsLoadFailed = ref(false)
const remediationLoading = ref(false)
const remediationLoadFailed = ref(false)
const campaignLoading = ref(false)
const campaignLoadFailed = ref(false)
const remediationStatsLoadFailed = ref(false)
const volumeStatsLoadFailed = ref(false)
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
let readinessPreviewRequestSequence = 0
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
const detailMaterialLoadFailed = ref(false)
const detailVolumeId = ref('')
const summaryStatsLoadFailed = computed(
  () => remediationStatsLoadFailed.value || volumeStatsLoadFailed.value,
)

const panelSignalMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'openRemediation',
    label: '待处理整改',
    value: remediationOpenCount.value,
    tone: remediationOpenCount.value > 0 ? 'orange' : undefined,
    emphasis: 'primary',
    actionLabel: remediationOpenCount.value > 0 ? '处理整改' : undefined,
  },
  {
    key: 'supervisionVolumes',
    label: '督导归档任务',
    value: supervisionVolumeCount.value,
    emphasis: 'secondary',
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
  { title: '主行动', key: 'actions', width: 140 },
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
  { title: '卷编号', dataIndex: 'volumeId', key: 'volumeId', width: 100 },
  { title: '状态', key: 'taskStatus', dataIndex: 'taskStatus', width: 100 },
  { title: '责任人', key: 'assigneeNickName', dataIndex: 'assigneeNickName', width: 120 },
  { title: '主行动', key: 'actions', width: 88 },
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
    {
      key: 'stored',
      label: '平均入库率',
      value: `${Math.round(stats.averageStoredRate * 100)}%`,
      emphasis: 'primary',
    },
    {
      key: 'rows',
      label: '院系课程',
      value: stats.rowCount,
      emphasis: 'secondary',
    },
  ]
})

const campaignSelectOptions = computed(() =>
  campaigns.value
    .filter((item) => item.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE)
    .map((item) => ({
      value: item.campaignId,
      label: item.campaignName,
    })),
)

const exportCampaignLabel = computed(() => {
  if (!exportCampaignId.value) {
    return undefined
  }
  return campaignSelectOptions.value.find((item) => item.value === exportCampaignId.value)?.label
})

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
    query: { scope: 'supervision' },
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
  // MVR-330：与 isTenantWideCollegeCoordinator / BE 导出门禁二次拦截
  if (isTenantWideCollegeCoordinator.value !== true) {
    void message.warning('仅全校学院协调人可导出评估材料包')
    return
  }
  if (!exportCampaignId.value || exportingManifest.value) return
  exportingManifest.value = true
  try {
    await runArchiveEvaluationExportFlow({
      campaignId: exportCampaignId.value,
      exportFn: exportEvaluationPackage,
      successMessage: '评估清单已导出',
      scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
      campaignLabel: exportCampaignLabel.value,
    })
  } catch (error) {
    showUserError(error, '导出评估清单失败')
  } finally {
    exportingManifest.value = false
  }
}

async function handleExportArchive() {
  // MVR-330：与 isTenantWideCollegeCoordinator / BE 导出门禁二次拦截
  if (isTenantWideCollegeCoordinator.value !== true) {
    void message.warning('仅全校学院协调人可导出评估材料包')
    return
  }
  if (!exportCampaignId.value || exportingArchive.value) return
  exportingArchive.value = true
  try {
    await runArchiveEvaluationExportFlow({
      campaignId: exportCampaignId.value,
      exportFn: exportEvaluationArchivePackage,
      successMessage: '四级目录包已导出',
      scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
      campaignLabel: exportCampaignLabel.value,
    })
  } catch (error) {
    showUserError(error, '导出四级目录包失败')
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
    volumeLoadFailed.value = false
  } catch (error) {
    volumeLoadFailed.value = true
    showUserError(error, '加载归档卷列表失败')
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
  const requestSequence = ++readinessPreviewRequestSequence
  if (!ensureTriplePeriodPair(statsFilter)) {
    statsLoading.value = false
    return
  }
  const request = buildPreviewRequest()
  if (!request) {
    statsLoading.value = false
    return
  }
  statsLoading.value = true
  try {
    const page = await pageSupervisionReadinessMatrixPreview(request)
    if (requestSequence !== readinessPreviewRequestSequence) return
    previewRows.value = page.list
    previewPagination.total = page.total
    if (page.pageNum != null) previewPagination.pageNum = page.pageNum
    if (page.pageSize != null) previewPagination.pageSize = page.pageSize
    try {
      previewStats.value = await getSupervisionReadinessMatrixPreviewStats(request)
      if (requestSequence !== readinessPreviewRequestSequence) return
      statsLoadFailed.value = false
    } catch (error) {
      if (requestSequence !== readinessPreviewRequestSequence) return
      previewStats.value = null
      statsLoadFailed.value = true
      showUserError(error, '就绪矩阵统计加载失败')
    }
  } catch (error) {
    if (requestSequence !== readinessPreviewRequestSequence) return
    previewRows.value = []
    previewPagination.total = 0
    previewStats.value = null
    statsLoadFailed.value = true
    showUserError(error, '加载就绪矩阵失败')
  } finally {
    if (requestSequence === readinessPreviewRequestSequence) {
      statsLoading.value = false
    }
  }
}

function queryReadinessPreview() {
  previewPagination.pageNum = 1
  void loadReadinessPreview()
}

async function loadRemediationStats(): Promise<void> {
  try {
    const termQuery = buildTriplePeriodQuery(volumeFilterForm)
    const stats = await getSupervisionRemediationStats(termQuery ?? {})
    remediationOpenCount.value = stats.openTaskCount
    remediationStatsLoadFailed.value = false
  } catch {
    remediationStatsLoadFailed.value = true
  }
}

async function loadSupervisionVolumeStats(): Promise<void> {
  try {
    const stats = await getSupervisionVolumeStats()
    supervisionVolumeCount.value = stats.supervisionVolumeCount
    volumeStatsLoadFailed.value = false
  } catch {
    volumeStatsLoadFailed.value = true
  }
}

async function loadRemediation() {
  remediationLoading.value = true
  try {
    const termQuery = buildTriplePeriodQuery(volumeFilterForm)
    const page = await pageSupervisionRemediationTasks({
      pageNum: remediationPagination.pageNum,
      pageSize: remediationPagination.pageSize,
      ...(termQuery ?? {}),
    })
    remediationTasks.value = page.list
    remediationPagination.total = page.total
    if (page.pageNum != null) remediationPagination.pageNum = page.pageNum
    if (page.pageSize != null) remediationPagination.pageSize = page.pageSize
    remediationLoadFailed.value = false
  } catch (error) {
    remediationLoadFailed.value = true
    showUserError(error, '加载整改任务失败')
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
    campaignLoadFailed.value = false
  } catch (error) {
    campaignLoadFailed.value = true
    showUserError(error, '加载评估活动失败')
  } finally {
    campaignLoading.value = false
  }
}

async function loadDetailMaterials(): Promise<void> {
  if (!detailVolumeId.value) {
    detailMaterials.value = []
    detailMaterialPagination.total = 0
    detailMaterialLoadFailed.value = false
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
    detailMaterialLoadFailed.value = false
    if (page.pageNum != null) detailMaterialPagination.pageNum = page.pageNum
    if (page.pageSize != null) detailMaterialPagination.pageSize = page.pageSize
  } catch (error) {
    detailMaterialLoadFailed.value = true
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
    showUserError(error, '加载归档卷详情失败')
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function openMarkProblem(volumeId: string) {
  // MVR-342/353：与 canViewSupervision / BE markSupervisionProblem 二次拦截
  if (canViewSupervision.value !== true) {
    void message.warning('当前账号无督导标记问题权限')
    return
  }
  const row = volumes.value.find((item) => item.volumeId === volumeId)
  if (row && !canMarkSupervisionProblemOnVolume(row)) {
    void message.warning(
      '当前卷状态不可标记督导问题（需收材/待验收/已入库，非移交待验收，且无开放整改）',
    )
    return
  }
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
  // MVR-421：与 canMarkSupervisionProblemOnVolume / openMarkProblem 同源二次闸
  if (canViewSupervision.value !== true) {
    void message.warning('当前账号无督导标记问题权限')
    return
  }
  const target = volumes.value.find((item) => item.volumeId === markProblemVolumeId.value)
  if (!target || !canMarkSupervisionProblemOnVolume(target)) {
    void message.warning(
      '当前卷状态不可标记督导问题（需收材/待验收/已入库，非移交待验收，且无开放整改）',
    )
    return
  }
  if (markProblemSubmitting.value === true) return
  const description = markProblemDescription.value.trim()
  if (!description) {
    showFormValidationMessage('请填写问题描述')
    return
  }
  markProblemSubmitting.value = true
  try {
    await markSupervisionProblem({
      volumeId: markProblemVolumeId.value,
      problemDescription: description,
      campaignId: markProblemCampaignId.value,
    })
    void message.success('问题已标记，整改任务已创建')
    markProblemOpen.value = false
    if (activeTab.value === 'remediation') {
      void loadRemediation()
      void loadRemediationStats()
    }
  } catch (error) {
    showUserError(error, '标记监管问题失败')
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
  () => volumeFilterForm.semester,
  (semester) => {
    if (semester == null && volumeFilterForm.academicYearStartYear != null) {
      applyTripleSemesterChange(volumeFilterForm, undefined)
    }
  },
)

watch(
  () => statsFilter.academicYearStartYear,
  (startYear) => {
    applyAcademicYearStartYearChange(statsFilter, startYear)
  },
)

watch(
  () => statsFilter.semester,
  (semester) => {
    if (semester == null && statsFilter.academicYearStartYear != null) {
      applyTripleSemesterChange(statsFilter, undefined)
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
  void loadRemediationStats()
  void loadSupervisionVolumeStats()
  void loadVolumes()
})
</script>

<style scoped>
.archive-supervision-panel__top-signal {
  margin-bottom: var(--dp-space-component);
}

.archive-supervision-panel__section {
  margin-top: var(--dp-space-block);
}

.archive-supervision-panel__remediation-tag {
  margin-left: var(--dp-space-component-xs);
}

.archive-supervision-panel__volume-actions {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  width: 100%;
}

.archive-supervision-panel__stats-actions,
.archive-supervision-panel__campaign-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
  width: 100%;
}

.archive-supervision-panel__export-hint {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.archive-supervision-panel__signal {
  margin-bottom: var(--dp-space-block);
}

.archive-supervision-panel__table {
  margin-top: var(--dp-space-component-tight);
}

.detail-head__title {
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
}

.detail-head__sub {
  color: var(--dp-text-muted);
  margin-bottom: var(--dp-space-component);
}

.section-title {
  margin: var(--dp-space-block) 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
}

.archive-supervision-panel__problem-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component);
}
</style>
