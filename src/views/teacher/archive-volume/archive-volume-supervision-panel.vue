<template>
  <a-tabs v-model:active-key="activeTab" class="archive-supervision-panel__tabs">
    <a-tab-pane key="volumes" tab="归档卷">
      <div class="archive-supervision-panel__problem-filters">
        <a-checkbox v-model:checked="volumeFilterForm.integrityFailedOnly">缺必交项</a-checkbox>
        <a-checkbox v-model:checked="volumeFilterForm.archiveOverdueOnly">归档逾期</a-checkbox>
        <a-checkbox v-model:checked="volumeFilterForm.delaySubmissionOverdueOnly"
          >补交逾期</a-checkbox
        >
      </div>
      <UiFilterBar
        v-model="volumeFilter"
        :fields="volumeFilterFields"
        variant="panel"
        show-labels
        search-text="查询"
        @search="loadVolumes"
        @reset="resetVolumeFilter"
      />
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
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction @click="openDetail(record.volumeId)">详情</UiTextAction>
            <UiTextAction @click="openMarkProblem(record.volumeId)">标记问题</UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </a-tab-pane>

    <a-tab-pane key="statistics" tab="统计">
      <div class="archive-supervision-panel__stats-toolbar">
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
        <UiButton size="sm" @click="loadStatistics">刷新统计</UiButton>
        <UiButton size="sm" variant="outline" @click="goReadinessMatrix">四学期矩阵</UiButton>
      </div>
      <a-spin :spinning="statsLoading">
        <SignalBand
          v-if="statistics"
          :metrics="statsMetrics"
          compact
          class="archive-supervision-panel__signal"
        />
        <UiDataTable
          v-if="statistics?.departmentCompletions?.length"
          pagination-mode="none"
          :columns="deptColumns"
          :data-source="statistics.departmentCompletions"
          :show-pagination="false"
          flat
          row-key="departmentId"
          size="small"
          class="archive-supervision-panel__table"
        />
      </a-spin>
    </a-tab-pane>

    <a-tab-pane key="remediation" tab="整改任务">
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
          <template v-else-if="column.key === 'volumeId'">
            <UiTextAction @click="goRemediationVolume(record)">{{ record.volumeId }}</UiTextAction>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction @click="goRemediationVolume(record)">去处理</UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </a-tab-pane>

    <a-tab-pane key="campaign" tab="评估批次">
      <div class="archive-supervision-panel__campaign-toolbar">
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
    </a-tab-pane>
  </a-tabs>

  <a-drawer
    v-model:open="detailOpen"
    title="归档卷详情（只读）"
    width="640"
    :destroy-on-close="true"
  >
    <a-spin :spinning="detailLoading">
      <template v-if="detail">
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
        />
      </template>
    </a-spin>
  </a-drawer>

  <a-modal
    v-model:open="markProblemOpen"
    title="标记问题"
    :confirm-loading="markProblemSubmitting"
    ok-text="提交"
    cancel-text="取消"
    @ok="submitMarkProblem"
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
  </a-modal>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignVO,
  ArchiveIntegrityStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveRemediationTaskVO,
  ArchiveVolumeDetailVO,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeStatusCode,
  ArchiveVolumeVO,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_EVALUATION_CAMPAIGN_STATUS_LABEL,
  ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
  ARCHIVE_INTEGRITY_STATUS_LABEL,
  ARCHIVE_MATERIAL_TYPE_LABEL,
  ARCHIVE_REMEDIATION_STATUS_LABEL,
  ARCHIVE_VOLUME_SOURCE_TYPE_LABEL,
  ARCHIVE_VOLUME_STATUS_LABEL,
  ARCHIVE_VOLUME_STATUS_TONE,
  exportEvaluationArchivePackage,
  exportEvaluationPackage,
  getSupervisionArchiveStatistics,
  getSupervisionArchiveVolumeDetail,
  listSupervisionCampaigns,
  listSupervisionRemediationTasks,
  markSupervisionProblem,
  pageSupervisionArchiveVolumes,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { remediationAssigneeLabel } from '@/utils/archive-remediation-display'
import { showUserError } from '@/utils/error-handler'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeSupervisionPanel' })

const router = useRouter()
const { isTenantWideCollegeCoordinator, loadGrants } = useArchiveDutyAccess()
const activeTab = ref('volumes')
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
const statistics = ref<Awaited<ReturnType<typeof getSupervisionArchiveStatistics>> | null>(null)
const remediationTasks = ref<ArchiveRemediationTaskVO[]>([])
const campaigns = ref<ArchiveEvaluationCampaignVO[]>([])
const detail = ref<ArchiveVolumeDetailVO | null>(null)

const volumeFilterForm = reactive({
  keyword: '',
  volumeStatus: undefined as ArchiveVolumeStatusCode | undefined,
  integrityFailedOnly: false,
  archiveOverdueOnly: false,
  delaySubmissionOverdueOnly: false,
})
const volumeFilter = computed<Record<string, unknown>>({
  get: () => volumeFilterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(volumeFilterForm, value)
  },
})
const volumePagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })
const statsFilter = reactive({
  academicYear: '',
  semester: undefined as SemesterCode | undefined,
})

const volumeFilterFields: FilterField[] = [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '档案号/标题' },
]

const volumeColumns: ColumnsType<ArchiveVolumeVO> = [
  { title: '归档卷', key: 'archive', dataIndex: 'archiveNo', width: 240 },
  { title: '院系', key: 'departmentName', dataIndex: 'departmentName', width: 140 },
  { title: '状态', key: 'volumeStatus', dataIndex: 'volumeStatus', width: 120 },
  { title: '操作', key: 'actions', width: 140 },
]

const deptColumns: ColumnsType<{
  departmentName?: string
  totalCount: number
  storedCount: number
  completionRate: number
}> = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '总数', dataIndex: 'totalCount', key: 'totalCount', width: 80 },
  { title: '已入库', dataIndex: 'storedCount', key: 'storedCount', width: 80 },
  { title: '完成率', dataIndex: 'completionRate', key: 'completionRate', width: 100 },
]

const remediationColumns: ColumnsType<ArchiveRemediationTaskVO> = [
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
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
        ARCHIVE_EVALUATION_CAMPAIGN_STATUS_LABEL,
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
  { title: '文件名', dataIndex: 'fileName', key: 'fileName' },
]

const statsMetrics = computed<SignalMetric[]>(() => {
  if (!statistics.value) return []
  return [
    { key: 'overdue', label: '逾期卷', value: statistics.value.overdueVolumeCount, tone: 'red' },
    { key: 'dept', label: '院系条目', value: statistics.value.departmentCompletions.length },
  ]
})

const campaignSelectOptions = computed(() =>
  campaigns.value.map((item) => ({
    value: item.campaignId,
    label: item.campaignName,
  })),
)

function volumeStatusLabel(code: ArchiveVolumeStatusCode) {
  return strictEnumLabel(ARCHIVE_VOLUME_STATUS_LABEL, code, 'volumeStatus')
}

function volumeStatusTone(code: ArchiveVolumeStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveIntegrityStatusCode) {
  return strictEnumLabel(ARCHIVE_INTEGRITY_STATUS_LABEL, code, 'integrityStatus')
}

function sourceTypeLabel(code: ArchiveVolumeSourceTypeCode) {
  return strictEnumLabel(ARCHIVE_VOLUME_SOURCE_TYPE_LABEL, code, 'sourceType')
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

function remediationStatusLabel(code: ArchiveRemediationTaskVO['taskStatus']) {
  return strictEnumLabel(ARCHIVE_REMEDIATION_STATUS_LABEL, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationTaskVO['taskStatus']): BadgeTone {
  if (code === 'CLOSED') return 'gray'
  if (code === 'RESUBMITTED') return 'green'
  if (code === 'IN_PROGRESS') return 'blue'
  return 'orange'
}

function goRemediationVolume(task: ArchiveRemediationTaskVO) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: task.volumeId },
    query: { tab: 'materials', remediationTaskId: task.taskId },
  })
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
  volumeLoading.value = true
  try {
    const result = await pageSupervisionArchiveVolumes({
      keyword: volumeFilterForm.keyword.trim() || undefined,
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
  volumeFilterForm.volumeStatus = undefined
  volumeFilterForm.integrityFailedOnly = false
  volumeFilterForm.archiveOverdueOnly = false
  volumeFilterForm.delaySubmissionOverdueOnly = false
  volumePagination.pageNum = 1
  void loadVolumes()
}

async function loadStatistics() {
  statsLoading.value = true
  try {
    statistics.value = await getSupervisionArchiveStatistics({
      academicYear: statsFilter.academicYear.trim() || undefined,
      semester: statsFilter.semester || undefined,
    })
  } catch (error) {
    showUserError(error)
  } finally {
    statsLoading.value = false
  }
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
  if (tab === 'statistics' && !statistics.value) void loadStatistics()
  if (tab === 'remediation' && remediationTasks.value.length === 0) void loadRemediation()
  if (tab === 'campaign' && campaigns.value.length === 0) void loadCampaigns()
})

watch(campaigns, (items) => {
  if (!exportCampaignId.value && items.length > 0) {
    exportCampaignId.value = items[0].campaignId
  }
})

onMounted(() => {
  void loadGrants()
  void loadVolumes()
})
</script>

<style scoped>
.archive-supervision-panel__remediation-tag {
  margin-left: var(--dp-space-1, 4px);
}

.archive-supervision-panel__stats-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.archive-supervision-panel__campaign-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.archive-supervision-panel__export-hint {
  margin: -8px 0 16px;
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
  margin-bottom: 12px;
}

.link-cell__sub {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}
</style>
