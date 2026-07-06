<template>
  <StageWorkbenchShell class="archive-eval-campaign">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="本科教学评估准备"
        subtitle="归档全链路 · 迎评批次与卷就绪度"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">
            返回列表
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goReadinessMatrix">
            就绪度矩阵
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand variant="tiles" compact :metrics="evalCampaignSignalMetrics" />
    </template>

    <WorkbenchSurfaceCard flush>
      <template #head>
        <UiSectionTabs v-model="activeTab" :items="tabItems" compact @change="handleTabChange" />
      </template>

      <div v-if="activeTab === 'list'" class="archive-eval-campaign__pane">
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
          empty-description="暂无迎评批次"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'term'">
              <span>{{ record.academicYear || '—' }}</span>
              <div v-if="record.semester" class="link-cell__sub">
                {{ formatSemester(record.semester) }}
              </div>
            </template>
            <template v-else-if="column.key === 'campaignStatus'">
              <UiTag :tone="campaignStatusTone(record.campaignStatus)" size="sm">
                {{ campaignStatusLabel(record.campaignStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'totalVolumeCount'">
              <span class="archive-eval-campaign__mono">{{ record.totalVolumeCount }}</span>
            </template>
            <template v-else-if="column.key === 'readyVolumeCount'">
              <span class="archive-eval-campaign__mono archive-eval-campaign__mono--strong">
                {{ record.readyVolumeCount }}
              </span>
            </template>
            <template v-else-if="column.key === 'readinessRatePercent'">
              <ArchiveReadinessRateBar :percent="record.readinessRatePercent" />
            </template>
            <template v-else-if="column.key === 'endTime'">
              {{ formatDateTime(record.endTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <UiTextAction
                  v-if="record.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE && canExportCampaign"
                  tone="primary"
                  @click="handleExportArchive(record.campaignId)"
                >
                  导出目录包
                </UiTextAction>
                <span v-else class="link-cell__sub">—</span>
              </div>
            </template>
          </template>
        </UiDataTable>
      </div>

      <div v-else class="archive-eval-campaign__pane">
        <h3 class="archive-eval-campaign__readiness-title">归档卷迎评就绪度</h3>
        <div class="archive-eval-campaign__readiness-toolbar">
          <a-select
            v-model:value="selectedCampaignId"
            :loading="campaignLoading"
            :options="campaignOptions"
            allow-clear
            placeholder="选择迎评批次"
            style="width: 280px"
          />
        </div>

        <UiDataTable
          v-model:current="readinessPagination.pageNum"
          v-model:page-size="readinessPagination.pageSize"
          :columns="readinessColumns"
          :data-source="readinessRows"
          :loading="readinessLoading"
          :total="readinessPagination.total"
          flat
          row-key="volumeId"
          size="middle"
          class="student-detail-table__data-table"
          empty-description="请选择迎评批次后查询"
          @page-change="loadReadinessVolumes"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archiveNo'">
              <UiTextAction tone="primary" @click="goVolumeDetail(record.volumeId)">
                {{ record.archiveNo }}
              </UiTextAction>
            </template>
            <template v-else-if="column.key === 'course'">
              {{ record.teachingClassName || record.archiveTitle || '—' }}
            </template>
            <template v-else-if="column.key === 'catalogReady'">
              <UiTag :tone="evaluationDimensionReadyTone(record.catalogReady, 'catalogReady')" size="sm">
                {{ evaluationDimensionReadyLabel(record.catalogReady, 'catalogReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'integrityReady'">
              <UiTag :tone="evaluationDimensionReadyTone(record.integrityReady, 'integrityReady')" size="sm">
                {{ evaluationDimensionReadyLabel(record.integrityReady, 'integrityReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'fourPropertyReady'">
              <UiTag :tone="evaluationDimensionReadyTone(record.fourPropertyReady, 'fourPropertyReady')" size="sm">
                {{ evaluationDimensionReadyLabel(record.fourPropertyReady, 'fourPropertyReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'transferReady'">
              <UiTag :tone="evaluationDimensionReadyTone(record.transferReady, 'transferReady')" size="sm">
                {{ evaluationDimensionReadyLabel(record.transferReady, 'transferReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'overallReady'">
              <UiTag :tone="evaluationDimensionReadyTone(record.overallReady, 'overallReady')" size="sm">
                {{ evaluationDimensionReadyLabel(record.overallReady, 'overallReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction tone="primary" @click="goVolumeDetail(record.volumeId)">
                查看卷
              </UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </div>
    </WorkbenchSurfaceCard>

    <ArchiveVolumeListNextStepsPanel variant="eval-campaign" />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignResponse,
  ArchiveEvaluationVolumeReadinessResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, UiSectionTabItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import { ArchiveDutyTypeCode } from '@/apis/mark/archive-config'
import {
  ArchiveEvaluationCampaignStatusCode,
  ArchiveEvaluationCampaignStatusDescription,
  exportEvaluationArchivePackage,
  getEvaluationCampaignReadinessPanel,
  listEvaluationCampaigns,
} from '@/apis/mark/archive-volume'
import ArchiveReadinessRateBar from '@/components/archive-volume/ArchiveReadinessRateBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import {
  ArchiveEvaluationDimensionReadyCode,
  ArchiveEvaluationDimensionReadyDescription,
  ArchiveEvaluationDimensionReadyTone,
} from '@/types/enums/archive-evaluation-dimension-ready-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'

defineOptions({ name: 'TeacherArchiveVolumeEvalCampaign' })

type EvalCampaignTabKey = 'list' | 'readiness'

const router = useRouter()
const route = useRoute()
const { hasDuty, loadGrants } = useArchiveDutyAccess()

const activeTab = ref<EvalCampaignTabKey>('list')
const campaignLoading = ref(false)
const readinessLoading = ref(false)
const exportingCampaignId = ref('')
const campaigns = ref<ArchiveEvaluationCampaignResponse[]>([])
const selectedCampaignId = ref<string>()
const readinessRows = ref<ArchiveEvaluationVolumeReadinessResponse[]>([])
const readinessPagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const canExportCampaign = computed(() => hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR))

const evalCampaignSignalMetrics = computed((): SignalMetric[] => {
  const activeCount = campaigns.value.filter((item) =>
    item.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE,
  ).length
  const totalVolumes = campaigns.value.reduce(
    (sum, item) => sum + (item.totalVolumeCount ?? 0),
    0,
  )
  const readyVolumes = campaigns.value.reduce(
    (sum, item) => sum + (item.readyVolumeCount ?? 0),
    0,
  )
  const readinessRate = totalVolumes > 0
    ? Math.round((readyVolumes / totalVolumes) * 100)
    : 0
  return [
    {
      key: 'campaigns',
      label: '迎评批次',
      value: campaigns.value.length,
      tone: 'blue',
    },
    {
      key: 'active',
      label: '进行中',
      value: activeCount,
      tone: activeCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'ready',
      label: '就绪卷',
      value: readyVolumes,
      tone: readyVolumes > 0 ? 'green' : 'gray',
      helper: totalVolumes > 0 ? `共 ${totalVolumes} 卷 · ${readinessRate}%` : undefined,
    },
  ]
})

const tabItems: UiSectionTabItem[] = [
  { key: 'list', label: '迎评批次' },
  { key: 'readiness', label: '卷就绪度' },
]

const campaignOptions = computed(() =>
  campaigns.value.map((item) => ({
    value: item.campaignId,
    label: item.campaignName,
  })),
)

const campaignColumns: ColumnsType<ArchiveEvaluationCampaignResponse> = [
  { title: '批次名称', dataIndex: 'campaignName', key: 'campaignName', width: 200 },
  { title: '学年学期', key: 'term', width: 120 },
  { title: '状态', key: 'campaignStatus', width: 90 },
  { title: '总卷数', key: 'totalVolumeCount', width: 80, align: 'right' },
  { title: '就绪卷', key: 'readyVolumeCount', width: 80, align: 'right' },
  { title: '就绪率', key: 'readinessRatePercent', width: 140 },
  { title: '截止日', key: 'endTime', width: 150 },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

const readinessColumns: ColumnsType<ArchiveEvaluationVolumeReadinessResponse> = [
  { title: '归档编号', key: 'archiveNo', width: 150 },
  { title: '课程', key: 'course', width: 180 },
  { title: '目录', key: 'catalogReady', width: 64, align: 'center' },
  { title: '完整性', key: 'integrityReady', width: 72, align: 'center' },
  { title: '四性', key: 'fourPropertyReady', width: 64, align: 'center' },
  { title: '移交', key: 'transferReady', width: 64, align: 'center' },
  { title: '整体', key: 'overallReady', width: 88 },
  { title: '操作', key: 'actions', width: 88, fixed: 'right' },
]

function evaluationDimensionReadyCode(
  ready: boolean | undefined,
  field: string,
): ArchiveEvaluationDimensionReadyCode {
  if (ready === true) {
    return ArchiveEvaluationDimensionReadyCode.READY
  }
  if (ready === false) {
    return ArchiveEvaluationDimensionReadyCode.NOT_READY
  }
  throw new Error(`卷就绪度字段 ${field} 缺失`)
}

function evaluationDimensionReadyLabel(ready: boolean | undefined, field: string): string {
  return strictEnumLabel(
    ArchiveEvaluationDimensionReadyDescription,
    evaluationDimensionReadyCode(ready, field),
    field,
  )
}

function evaluationDimensionReadyTone(ready: boolean | undefined, field: string): BadgeTone {
  return ArchiveEvaluationDimensionReadyTone[evaluationDimensionReadyCode(ready, field)]
}

function campaignStatusLabel(code: ArchiveEvaluationCampaignStatusCode): string {
  return strictEnumLabel(ArchiveEvaluationCampaignStatusDescription, code, 'campaignStatus')
}

function campaignStatusTone(code: ArchiveEvaluationCampaignStatusCode): BadgeTone {
  return code === ArchiveEvaluationCampaignStatusCode.ACTIVE ? 'blue' : 'green'
}

function goList(): void {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goReadinessMatrix(): void {
  void router.push({ name: 'TeacherArchiveVolumeReadinessMatrix' })
}

function goVolumeDetail(volumeId: string): void {
  void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
}

async function loadCampaigns(): Promise<void> {
  campaignLoading.value = true
  try {
    campaigns.value = await listEvaluationCampaigns()
    if (!selectedCampaignId.value && campaigns.value.length > 0) {
      selectedCampaignId.value = campaigns.value[0].campaignId
      if (activeTab.value === 'readiness') {
        void loadReadinessVolumes()
      }
    }
  } catch (error) {
    showUserError(error, '迎评批次加载失败')
    campaigns.value = []
  } finally {
    campaignLoading.value = false
  }
}

async function loadReadinessVolumes(): Promise<void> {
  if (!selectedCampaignId.value) {
    readinessRows.value = []
    readinessPagination.total = 0
    return
  }
  readinessLoading.value = true
  try {
    const result = await getEvaluationCampaignReadinessPanel({
      campaignId: selectedCampaignId.value,
      pageNum: readinessPagination.pageNum,
      pageSize: readinessPagination.pageSize,
    })
    readinessRows.value = readPageList(result, '卷就绪度加载失败')
    readinessPagination.total = readPageTotal(result)
  } catch (error) {
    showUserError(error, '卷就绪度加载失败')
    readinessRows.value = []
    readinessPagination.total = 0
  } finally {
    readinessLoading.value = false
  }
}

function handleTabChange(key: string | number): void {
  if (key === 'readiness' && selectedCampaignId.value) {
    void loadReadinessVolumes()
  }
}

watch(selectedCampaignId, (campaignId) => {
  if (!campaignId || activeTab.value !== 'readiness') {
    return
  }
  readinessPagination.pageNum = 1
  void loadReadinessVolumes()
})

async function handleExportArchive(campaignId: string): Promise<void> {
  if (exportingCampaignId.value) {
    return
  }
  exportingCampaignId.value = campaignId
  try {
    const result = await exportEvaluationArchivePackage(campaignId)
    if (result.exportFileId) {
      await downloadFile({ nodeId: result.exportFileId })
      message.success('四级目录包导出成功')
    }
  } catch (error) {
    showUserError(error, '导出四级目录包失败')
  } finally {
    exportingCampaignId.value = ''
  }
}

onMounted(async () => {
  await loadGrants()
  await loadCampaigns()
  const volumeId = typeof route.query.volumeId === 'string' ? route.query.volumeId : undefined
  if (volumeId) {
    activeTab.value = 'readiness'
    void loadReadinessVolumes()
  }
})

watch(
  () => route.query.volumeId,
  (volumeId) => {
    if (typeof volumeId === 'string' && volumeId) {
      activeTab.value = 'readiness'
      void loadReadinessVolumes()
    }
  },
)
</script>

<style scoped lang="scss">
.archive-eval-campaign {
  &__pane {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-3, 12px);
  }

  &__readiness-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__readiness-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2, 8px);
  }

  &__mono {
    font-variant-numeric: tabular-nums;
    font-family: var(--dp-font-mono, ui-monospace, monospace);

    &--strong {
      font-weight: 600;
    }
  }
}

.link-cell__sub {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}
</style>
