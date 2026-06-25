<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="purple" size="sm">督导抽查（只读）</UiTag>
        </template>
      </ContextBar>
    </template>

    <a-tabs v-model:active-key="activeTab" class="archive-supervision-page__tabs">
      <a-tab-pane key="volumes" tab="归档卷">
        <UiFilterBar
          v-model="volumeFilter"
          :fields="volumeFilterFields"
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
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="openDetail(record.volumeId)">详情</UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </a-tab-pane>

      <a-tab-pane key="statistics" tab="统计">
        <div class="archive-supervision-page__stats-toolbar">
          <a-input
            v-model:value="statsFilter.academicYear"
            placeholder="学年 如 2024-2025"
            style="width: 160px"
          />
          <a-input
            v-model:value="statsFilter.semester"
            placeholder="学期 1/2"
            style="width: 100px"
          />
          <UiButton size="sm" @click="loadStatistics">刷新统计</UiButton>
        </div>
        <a-spin :spinning="statsLoading">
          <div v-if="statistics" class="archive-supervision-page__stats-grid">
            <a-card size="small" title="逾期卷">
              <div class="stat-value">{{ statistics.overdueVolumeCount }}</div>
            </a-card>
            <a-card size="small" title="院系完成率">
              <UiDataTable
                pagination-mode="none"
                :columns="deptColumns"
                :data-source="statistics.departmentCompletions"
                :show-pagination="false"
                flat
                row-key="departmentId"
                size="small"
              />
            </a-card>
            <a-card size="small" title="缺项材料">
              <UiDataTable
                pagination-mode="none"
                :columns="missingColumns"
                :data-source="statistics.missingMaterials"
                :show-pagination="false"
                flat
                row-key="materialType"
                size="small"
              />
            </a-card>
          </div>
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
        />
      </a-tab-pane>

      <a-tab-pane key="campaign" tab="评估批次">
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
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveDepartmentCompletionVO,
  ArchiveEvaluationCampaignVO,
  ArchiveIntegrityStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveMissingMaterialStatVO,
  ArchiveRemediationTaskVO,
  ArchiveVolumeDetailVO,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeStatusCode,
  ArchiveVolumeVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import { onMounted, reactive, ref, watch } from 'vue'
import {
  ARCHIVE_EVALUATION_CAMPAIGN_STATUS_LABEL,
  ARCHIVE_INTEGRITY_STATUS_LABEL,
  ARCHIVE_MATERIAL_TYPE_LABEL,
  ARCHIVE_REMEDIATION_STATUS_LABEL,
  ARCHIVE_VOLUME_SOURCE_TYPE_LABEL,
  ARCHIVE_VOLUME_STATUS_LABEL,
  ARCHIVE_VOLUME_STATUS_TONE,
  getSupervisionArchiveStatistics,
  getSupervisionArchiveVolumeDetail,
  listSupervisionCampaigns,
  listSupervisionRemediationTasks,
  pageSupervisionArchiveVolumes,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveSupervisionInspect' })

const activeTab = ref('volumes')
const volumeLoading = ref(false)
const statsLoading = ref(false)
const remediationLoading = ref(false)
const campaignLoading = ref(false)
const detailLoading = ref(false)
const detailOpen = ref(false)
const volumes = ref<ArchiveVolumeVO[]>([])
const statistics = ref<Awaited<ReturnType<typeof getSupervisionArchiveStatistics>> | null>(null)
const remediationTasks = ref<ArchiveRemediationTaskVO[]>([])
const campaigns = ref<ArchiveEvaluationCampaignVO[]>([])
const detail = ref<ArchiveVolumeDetailVO | null>(null)

const volumeFilter = reactive({ keyword: '', volumeStatus: undefined as ArchiveVolumeStatusCode | undefined })
const volumePagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })
const statsFilter = reactive({ academicYear: '', semester: '' })

const volumeFilterFields: FilterField[] = [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '档案号/标题' },
]

const volumeColumns: ColumnsType<ArchiveVolumeVO> = [
  { title: '归档卷', key: 'archive', dataIndex: 'archiveNo', width: 240 },
  { title: '院系', key: 'departmentName', dataIndex: 'departmentName', width: 140 },
  { title: '状态', key: 'volumeStatus', dataIndex: 'volumeStatus', width: 120 },
  { title: '操作', key: 'actions', width: 80 },
]

const deptColumns: ColumnsType<ArchiveDepartmentCompletionVO> = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '总数', dataIndex: 'totalCount', key: 'totalCount', width: 80 },
  { title: '已入库', dataIndex: 'storedCount', key: 'storedCount', width: 80 },
  { title: '完成率', dataIndex: 'completionRate', key: 'completionRate', width: 100 },
]

const missingColumns: ColumnsType<ArchiveMissingMaterialStatVO> = [
  {
    title: '材料类型',
    key: 'materialType',
    dataIndex: 'materialType',
    customRender: ({ record }) => materialTypeLabel(record.materialType),
  },
  { title: '缺项卷数', dataIndex: 'missingVolumeCount', key: 'missingVolumeCount', width: 100 },
]

const remediationColumns: ColumnsType<ArchiveRemediationTaskVO> = [
  { title: '任务', dataIndex: 'taskTitle', key: 'taskTitle' },
  { title: '卷ID', dataIndex: 'volumeId', key: 'volumeId', width: 100 },
  {
    title: '状态',
    key: 'taskStatus',
    dataIndex: 'taskStatus',
    width: 100,
    customRender: ({ record }) =>
      strictEnumLabel(ARCHIVE_REMEDIATION_STATUS_LABEL, record.taskStatus, 'taskStatus'),
  },
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
      strictEnumLabel(ARCHIVE_EVALUATION_CAMPAIGN_STATUS_LABEL, record.campaignStatus, 'campaignStatus'),
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

async function loadVolumes() {
  volumeLoading.value = true
  try {
    const result = await pageSupervisionArchiveVolumes({
      keyword: volumeFilter.keyword.trim() || undefined,
      volumeStatus: volumeFilter.volumeStatus,
      pageNum: volumePagination.pageNum,
      pageSize: volumePagination.pageSize,
    })
    volumes.value = readPageList(result, '督导归档卷列表异常，请刷新后重试')
    volumePagination.total = readPageTotal(result)
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    volumeLoading.value = false
  }
}

function resetVolumeFilter() {
  volumeFilter.keyword = ''
  volumeFilter.volumeStatus = undefined
  volumePagination.pageNum = 1
  loadVolumes()
}

async function loadStatistics() {
  statsLoading.value = true
  try {
    statistics.value = await getSupervisionArchiveStatistics({
      academicYear: statsFilter.academicYear.trim() || undefined,
      semester: statsFilter.semester.trim() || undefined,
    })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    statsLoading.value = false
  }
}

async function loadRemediation() {
  remediationLoading.value = true
  try {
    remediationTasks.value = await listSupervisionRemediationTasks()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    remediationLoading.value = false
  }
}

async function loadCampaigns() {
  campaignLoading.value = true
  try {
    campaigns.value = await listSupervisionCampaigns()
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    campaignLoading.value = false
  }
}

async function openDetail(volumeId: string) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await getSupervisionArchiveVolumeDetail(volumeId)
  }
  catch (error) {
    showUserError(error)
    detailOpen.value = false
  }
  finally {
    detailLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'statistics' && !statistics.value) {
    loadStatistics()
  }
  if (tab === 'remediation' && remediationTasks.value.length === 0) {
    loadRemediation()
  }
  if (tab === 'campaign' && campaigns.value.length === 0) {
    loadCampaigns()
  }
})

onMounted(() => {
  loadVolumes()
})
</script>

<style scoped>
.archive-supervision-page__tabs {
  padding: 0 16px 16px;
}
.archive-supervision-page__stats-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.archive-supervision-page__stats-grid {
  display: grid;
  gap: 16px;
}
.stat-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}
.detail-head__title {
  font-size: 16px;
  font-weight: 600;
}
.detail-head__sub {
  color: var(--text-secondary, #8c8c8c);
  margin-bottom: 12px;
}
.section-title {
  margin: 16px 0 8px;
  font-size: 14px;
}
.link-cell__sub {
  color: var(--text-secondary, #8c8c8c);
  font-size: 12px;
}
</style>
