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
            {{ backButtonLabel }}
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goReadinessMatrix"> 就绪度矩阵 </UiButton>
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
          v-model:current="campaignPagination.pageNum"
          v-model:page-size="campaignPagination.pageSize"
          pagination-mode="server"
          :columns="campaignColumns"
          :data-source="campaigns"
          :loading="campaignLoading"
          flat
          row-key="campaignId"
          size="middle"
          :total="campaignPagination.total"
          empty-description="暂无迎评批次"
          @page-change="handleCampaignPageChange"
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
              <UiTableActions
                v-if="
                  record.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE &&
                  canExportCampaign
                "
                :items="buildCampaignActions(record)"
                split
                @action="(key) => handleCampaignAction(key, record)"
              />
              <span v-else class="link-cell__sub">—</span>
            </template>
          </template>
        </UiDataTable>
      </div>

      <div v-else class="archive-eval-campaign__pane">
        <h3 class="archive-eval-campaign__readiness-title">归档任务迎评就绪度</h3>
        <p v-if="readinessFocusVolumeId" class="archive-eval-campaign__focus-hint">
          当前聚焦卷：<UiTextAction tone="primary" @click="goVolumeDetail(readinessFocusVolumeId)">
            {{ readinessFocusVolumeId }}
          </UiTextAction>
          <UiTextAction tone="default" @click="dismissReadinessVolumeFocus">查看整批</UiTextAction>
        </p>
        <div class="archive-eval-campaign__readiness-toolbar">
          <a-select
            v-model:value="selectedCampaignId"
            :loading="campaignOptionLoading"
            :options="campaignOptions"
            allow-clear
            placeholder="选择迎评批次"
            style="width: 280px"
          />
        </div>

        <UiDataTable
          v-model:current="readinessPagination.pageNum"
          v-model:page-size="readinessPagination.pageSize"
          pagination-mode="server"
          :columns="readinessColumns"
          :data-source="readinessRows"
          :loading="readinessLoading"
          :total="readinessPagination.total"
          flat
          row-key="volumeId"
          size="middle"
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
              <UiTag
                :tone="evaluationDimensionReadyTone(record.catalogReady, 'catalogReady')"
                size="sm"
              >
                {{ evaluationDimensionReadyLabel(record.catalogReady, 'catalogReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'integrityReady'">
              <UiTag
                :tone="evaluationDimensionReadyTone(record.integrityReady, 'integrityReady')"
                size="sm"
              >
                {{ evaluationDimensionReadyLabel(record.integrityReady, 'integrityReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'fourPropertyReady'">
              <UiTag
                :tone="evaluationDimensionReadyTone(record.fourPropertyReady, 'fourPropertyReady')"
                size="sm"
              >
                {{ evaluationDimensionReadyLabel(record.fourPropertyReady, 'fourPropertyReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'transferReady'">
              <UiTag
                :tone="evaluationDimensionReadyTone(record.transferReady, 'transferReady')"
                size="sm"
              >
                {{ evaluationDimensionReadyLabel(record.transferReady, 'transferReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'overallReady'">
              <UiTag
                :tone="evaluationDimensionReadyTone(record.overallReady, 'overallReady')"
                size="sm"
              >
                {{ evaluationDimensionReadyLabel(record.overallReady, 'overallReady') }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildReadinessActions(record)"
                split
                @action="(key) => handleReadinessAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </div>
    </WorkbenchSurfaceCard>

    <a-modal
      v-model:open="campaignPickOpen"
      title="选择迎评批次"
      ok-text="确认"
      cancel-text="取消"
      :ok-button-props="{ disabled: !campaignPickPendingId }"
      @ok="confirmCampaignPick"
    >
      <p v-if="campaignPickTruncated" class="archive-eval-campaign__pick-hint">
        命中批次较多，仅展示部分结果，请手动选择。
      </p>
      <a-radio-group
        v-model:value="campaignPickPendingId"
        class="archive-eval-campaign__pick-group"
      >
        <a-radio
          v-for="item in pendingCampaignOptions"
          :key="item.campaignId"
          :value="item.campaignId"
          class="archive-eval-campaign__pick-item"
        >
          {{ item.campaignName }}
        </a-radio>
      </a-radio-group>
    </a-modal>
    <ArchiveEvaluationExportTaskModal />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignResolveItem,
  ArchiveEvaluationCampaignResponse,
  ArchiveEvaluationCampaignStatsVO,
  ArchiveEvaluationVolumeReadinessResponse,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
  ArchiveEvaluationCampaignStatusCode,
  ArchiveEvaluationCampaignStatusDescription,
  exportEvaluationArchivePackage,
  exportEvaluationPackage,
  getEvaluationCampaignReadinessPanel,
  getEvaluationCampaignStats,
  pageEvaluationCampaigns,
  resolveEvaluationCampaignByVolume,
} from '@/apis/mark/archive-volume'
import type {
  BadgeTone,
  UiSectionTabItem,
  UiTableRowActionItem,
} from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArchiveDutyTypeCode } from '@/apis/mark/archive-config'
import ArchiveReadinessRateBar from '@/components/archive-volume/ArchiveReadinessRateBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { runArchiveEvaluationExportFlow } from '@/composables/useArchiveEvaluationExportFlow'
import { DEFAULT_LIST_PAGE_SIZE, EXPORT_PAGE_SIZE } from '@/constants/pagination'
import {
  ArchiveEvaluationDimensionReadyCode,
  ArchiveEvaluationDimensionReadyDescription,
  ArchiveEvaluationDimensionReadyTone,
} from '@/types/enums/archive-evaluation-dimension-ready-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveEvaluationExportTaskModal from '@/views/teacher/archive-volume/components/ArchiveEvaluationExportTaskModal.vue'

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
const campaignPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const campaignSelectOptions = ref<ArchiveEvaluationCampaignResponse[]>([])
const campaignOptionLoading = ref(false)
const campaignStats = ref<ArchiveEvaluationCampaignStatsVO | null>(null)
const selectedCampaignId = ref<string>()
const readinessRows = ref<ArchiveEvaluationVolumeReadinessResponse[]>([])
const readinessPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const campaignPickOpen = ref(false)
const campaignPickTruncated = ref(false)
const campaignPickPendingId = ref<string>()
const pendingCampaignOptions = ref<ArchiveEvaluationCampaignResolveItem[]>([])

const focusVolumeDismissed = ref(false)

const focusVolumeId = computed(() => {
  const volumeId = route.query.volumeId
  return typeof volumeId === 'string' && volumeId ? volumeId : undefined
})

const readinessFocusVolumeId = computed(() =>
  focusVolumeDismissed.value ? undefined : focusVolumeId.value,
)

const canExportCampaign = computed(() => hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR))

const backButtonLabel = computed(() => {
  const volumeId = route.query.volumeId
  return typeof volumeId === 'string' && volumeId ? '返回任务详情' : '返回列表'
})

const evalCampaignSignalMetrics = computed((): SignalMetric[] => {
  const stats = campaignStats.value
  if (!stats) return []
  return [
    {
      key: 'campaigns',
      label: '迎评批次',
      value: stats.campaignCount,
      tone: 'blue',
    },
    {
      key: 'active',
      label: '进行中',
      value: stats.activeCampaignCount,
      tone: stats.activeCampaignCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'ready',
      label: '就绪卷',
      value: stats.readyVolumeCount,
      tone: stats.readyVolumeCount > 0 ? 'green' : 'gray',
      helper:
        stats.totalVolumeCount > 0
          ? `共 ${stats.totalVolumeCount} 卷 · ${stats.readinessRatePercent}%`
          : undefined,
    },
  ]
})

const tabItems: UiSectionTabItem[] = [
  { key: 'list', label: '迎评批次' },
  { key: 'readiness', label: '卷就绪度' },
]

const campaignOptions = computed(() =>
  campaignSelectOptions.value.map((item) => ({
    value: item.campaignId,
    label: item.campaignName,
  })),
)

const campaignColumns: ColumnsType<ArchiveEvaluationCampaignResponse> = [
  { title: '批次名称', dataIndex: 'campaignName', key: 'campaignName', width: 200, fixed: 'left' },
  { title: '学年学期', key: 'term', width: 120 },
  { title: '状态', key: 'campaignStatus', width: 90 },
  { title: '总卷数', key: 'totalVolumeCount', width: 80, align: 'right' },
  { title: '就绪卷', key: 'readyVolumeCount', width: 80, align: 'right' },
  { title: '就绪率', key: 'readinessRatePercent', width: 140 },
  { title: '截止日', key: 'endTime', width: 150 },
  { title: '操作', key: 'actions', width: 200 },
]

const readinessColumns: ColumnsType<ArchiveEvaluationVolumeReadinessResponse> = [
  { title: '归档编号', key: 'archiveNo', width: 150, fixed: 'left' },
  { title: '课程', key: 'course', width: 180 },
  { title: '目录', key: 'catalogReady', width: 64, align: 'center' },
  { title: '完整性', key: 'integrityReady', width: 72, align: 'center' },
  { title: '四性', key: 'fourPropertyReady', width: 64, align: 'center' },
  { title: '移交', key: 'transferReady', width: 64, align: 'center' },
  { title: '整体', key: 'overallReady', width: 88 },
  { title: '操作', key: 'actions', width: 88 },
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
  const volumeId = typeof route.query.volumeId === 'string' ? route.query.volumeId : undefined
  if (volumeId) {
    void router.push({
      name: 'TeacherArchiveVolumeDetail',
      params: { volumeId },
    })
    return
  }
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goReadinessMatrix(): void {
  void router.push({ name: 'TeacherArchiveVolumeReadinessMatrix' })
}

function buildCampaignActions(_record: ArchiveEvaluationCampaignResponse): UiTableRowActionItem[] {
  return [
    { key: 'export-manifest', label: '导出材料清单' },
    { key: 'export-archive', label: '导出目录包', tone: 'primary' },
  ]
}

function handleCampaignAction(key: string, record: ArchiveEvaluationCampaignResponse): void {
  if (key === 'export-manifest') {
    void handleExportManifest(record)
  } else if (key === 'export-archive') {
    void handleExportArchive(record)
  }
}

function buildReadinessActions(
  _record: ArchiveEvaluationVolumeReadinessResponse,
): UiTableRowActionItem[] {
  return [{ key: 'detail', label: '查看卷', tone: 'primary' }]
}

function handleReadinessAction(
  key: string,
  record: ArchiveEvaluationVolumeReadinessResponse,
): void {
  if (key === 'detail') {
    goVolumeDetail(record.volumeId)
  }
}

function dismissReadinessVolumeFocus(): void {
  focusVolumeDismissed.value = true
  readinessPagination.pageNum = 1
  void loadReadinessVolumes()
}

function goVolumeDetail(volumeId: string): void {
  void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
}

async function loadCampaignStats(): Promise<void> {
  try {
    campaignStats.value = await getEvaluationCampaignStats()
  } catch {
    campaignStats.value = null
  }
}

async function loadAllCampaignOptions(): Promise<ArchiveEvaluationCampaignResponse[]> {
  const all: ArchiveEvaluationCampaignResponse[] = []
  let pageNum = 1
  while (true) {
    const page = await pageEvaluationCampaigns({ pageNum, pageSize: EXPORT_PAGE_SIZE })
    all.push(...page.list)
    if (all.length >= page.total) {
      break
    }
    pageNum += 1
  }
  return all
}

async function loadCampaignOptions(): Promise<void> {
  campaignOptionLoading.value = true
  try {
    campaignSelectOptions.value = await loadAllCampaignOptions()
    if (
      !focusVolumeId.value &&
      !selectedCampaignId.value &&
      campaignSelectOptions.value.length > 0
    ) {
      selectedCampaignId.value = campaignSelectOptions.value[0].campaignId
      if (activeTab.value === 'readiness') {
        void loadReadinessVolumes()
      }
    }
  } catch (error) {
    showUserError(error, '迎评批次选项加载失败')
    campaignSelectOptions.value = []
  } finally {
    campaignOptionLoading.value = false
  }
}

async function loadCampaigns(): Promise<void> {
  campaignLoading.value = true
  try {
    const page = await pageEvaluationCampaigns({
      pageNum: campaignPagination.pageNum,
      pageSize: campaignPagination.pageSize,
    })
    campaigns.value = page.list
    campaignPagination.pageNum = page.pageNum
    campaignPagination.pageSize = page.pageSize
    campaignPagination.total = page.total
  } catch (error) {
    showUserError(error, '迎评批次加载失败')
    campaigns.value = []
    campaignPagination.total = 0
  } finally {
    campaignLoading.value = false
  }
}

function handleCampaignPageChange(page: { current: number; pageSize: number }): void {
  campaignPagination.pageNum = page.current
  campaignPagination.pageSize = page.pageSize
  void loadCampaigns()
}

async function bootstrapFromVolumeQuery(volumeId: string): Promise<void> {
  activeTab.value = 'readiness'
  try {
    const resolveResult = await resolveEvaluationCampaignByVolume({ volumeId })
    if (!resolveResult.campaigns.length) {
      message.warning('未找到该卷所属的进行中迎评批次')
      selectedCampaignId.value = undefined
      readinessRows.value = []
      readinessPagination.total = 0
      return
    }
    const autoPick =
      !resolveResult.truncated &&
      resolveResult.campaigns.length === 1 &&
      resolveResult.suggestedCampaignId
    if (autoPick) {
      selectedCampaignId.value = resolveResult.suggestedCampaignId
      readinessPagination.pageNum = 1
      await loadReadinessVolumes()
      return
    }
    selectedCampaignId.value = undefined
    readinessRows.value = []
    readinessPagination.total = 0
    pendingCampaignOptions.value = resolveResult.campaigns
    campaignPickTruncated.value = resolveResult.truncated
    campaignPickPendingId.value = undefined
    campaignPickOpen.value = true
    if (resolveResult.truncated) {
      message.warning('命中批次较多，请手动选择迎评批次')
    }
  } catch (error) {
    showUserError(error, '迎评批次反查失败')
  }
}

function confirmCampaignPick(): void {
  if (!campaignPickPendingId.value) {
    return
  }
  selectedCampaignId.value = campaignPickPendingId.value
  campaignPickOpen.value = false
  readinessPagination.pageNum = 1
  void loadReadinessVolumes()
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
      volumeId: readinessFocusVolumeId.value,
    })
    readinessRows.value = result.list
    readinessPagination.total = result.total
    readinessPagination.pageNum = result.pageNum
    readinessPagination.pageSize = result.pageSize
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

async function handleExportManifest(record: ArchiveEvaluationCampaignResponse): Promise<void> {
  if (exportingCampaignId.value) {
    return
  }
  exportingCampaignId.value = record.campaignId
  try {
    await runArchiveEvaluationExportFlow({
      campaignId: record.campaignId,
      exportFn: exportEvaluationPackage,
      successMessage: '评估材料清单已导出',
      scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
      campaignLabel: record.campaignName,
    })
  } catch (error) {
    showUserError(error, '导出评估材料清单失败')
  } finally {
    exportingCampaignId.value = ''
  }
}

async function handleExportArchive(record: ArchiveEvaluationCampaignResponse): Promise<void> {
  if (exportingCampaignId.value) {
    return
  }
  exportingCampaignId.value = record.campaignId
  try {
    await runArchiveEvaluationExportFlow({
      campaignId: record.campaignId,
      exportFn: exportEvaluationArchivePackage,
      successMessage: '四级目录包导出成功',
      scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
      campaignLabel: record.campaignName,
    })
  } catch (error) {
    showUserError(error, '导出四级目录包失败')
  } finally {
    exportingCampaignId.value = ''
  }
}

onMounted(async () => {
  await loadGrants()
  void loadCampaignStats()
  await loadCampaignOptions()
  await loadCampaigns()
  if (focusVolumeId.value) {
    await bootstrapFromVolumeQuery(focusVolumeId.value)
  }
})

watch(
  () => route.query.volumeId,
  (volumeId) => {
    focusVolumeDismissed.value = false
    if (typeof volumeId === 'string' && volumeId) {
      void bootstrapFromVolumeQuery(volumeId)
    }
  },
)
</script>

<style scoped lang="scss">
.archive-eval-campaign {
  &__pane {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-3);
  }

  &__readiness-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__focus-hint {
    margin: 0;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__readiness-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2);
  }

  &__mono {
    font-variant-numeric: tabular-nums;
    font-family: var(--dp-font-mono);

    &--strong {
      font-weight: 600;
    }
  }

  &__pick-hint {
    margin: 0 0 var(--dp-space-2);
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__pick-group {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-2);
  }

  &__pick-item {
    display: flex;
  }
}
</style>
