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
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand variant="panel" :metrics="evalCampaignSignalMetrics" />
    </template>

    <WorkbenchSurfaceCard flush>
      <UiAlertStrip tone="info" dense class="archive-eval-campaign__domain-hint">
        本页为<strong>课程考核归档材料</strong>，用于本科教学评估迎检。OBE
        达成度、间接评价与认证证据请在
        <RouterLink :to="{ name: 'QualityDashboard' }">「质量评价」</RouterLink>
        工作台处理。
      </UiAlertStrip>
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
            <template v-else-if="column.key === 'openRemediationTaskCount'">
              <UiTextAction
                v-if="(record.openRemediationTaskCount ?? 0) > 0"
                tone="primary"
                @click="handleOpenRemediationCountClick(record)"
              >
                <span class="archive-eval-campaign__mono archive-eval-campaign__mono--warn">
                  {{ record.openRemediationTaskCount }}
                </span>
              </UiTextAction>
              <span v-else class="archive-eval-campaign__mono">0</span>
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
                  record.campaignStatus === ArchiveEvaluationCampaignStatusCode.ACTIVE
                    && canExportCampaign
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

      <div v-else-if="activeTab === 'readiness'" class="archive-eval-campaign__pane">
        <h3 class="archive-eval-campaign__readiness-title">归档任务迎评就绪度</h3>
        <p v-if="resolveHint" class="archive-eval-campaign__resolve-hint">{{ resolveHint }}</p>
        <p v-if="readinessFocusVolumeId" class="archive-eval-campaign__focus-hint">
          当前聚焦卷：<UiTextAction tone="primary" @click="goVolumeDetail(readinessFocusVolumeId)">
            {{ readinessFocusVolumeId }}
          </UiTextAction>
          <UiTextAction tone="default" @click="dismissReadinessVolumeFocus">查看整批</UiTextAction>
        </p>
        <div class="archive-eval-campaign__readiness-toolbar">
          <UiSelect
            size="sm"
            v-model="selectedCampaignId"
            :loading="campaignOptionLoading"
            :options="campaignOptions"
            allow-clear
            placeholder="选择迎评批次"
            style="width: 280px"
          />
          <UiCheckbox v-model="onlyOpenRemediation">仅待整改卷（含他人跟进）</UiCheckbox>
        </div>
        <UiAlertStrip
          v-if="!selectedCampaignId"
          tone="info"
          size="sm"
          dense
          inline
          :show-icon="false"
          class="archive-eval-campaign__gate"
        >
          <template #default>
            <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
              <UiTag tone="blue" size="sm">未选批次</UiTag>
              <span>请选择迎评批次后查询归档任务就绪度</span>
            </span>
          </template>
        </UiAlertStrip>
        <ArchiveEvalCampaignScopeSummary
          v-if="selectedCampaignMeta && scopeSummary"
          :campaign-name="selectedCampaignMeta.campaignName"
          :scope-summary="scopeSummary"
          :list-total-volume-count="selectedCampaignMeta.totalVolumeCount"
          :panel-total="readinessPagination.total"
        />

        <UiDataTable
          v-if="selectedCampaignId"
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
          empty-description="当前批次暂无就绪卷"
          @page-change="loadReadinessVolumes"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archiveNo'">
              <UiTextAction tone="primary" @click="goVolumeDetail(record.volumeId)">
                {{ record.archiveNo }}
              </UiTextAction>
            </template>
            <template v-else-if="column.key === 'course'">
              <div>{{ record.teachingClassName || record.archiveTitle || '—' }}</div>
              <div
                v-if="
                  record.scopeMatchKind
                    === ArchiveEvaluationCampaignScopeMatchKindCode.CROSS_TERM_REMEDIATION
                "
                class="link-cell__sub"
              >
                跨学期收集中
              </div>
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
              <div
                v-if="record.hasDomainOpenRemediation && !(record.openRemediationTaskCount ?? 0)"
                class="link-cell__sub"
              >
                他人跟进中
              </div>
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

      <div v-else class="archive-eval-campaign__pane">
        <p class="archive-eval-campaign__mixed-hint">
          院系范围内仍待复核的疑似混扫批次，点击档案号进入卷详情 scan-review Tab。
        </p>
        <div class="archive-eval-campaign__mixed-toolbar">
          <UiSelect
            size="sm"
            v-model="mixedFilterForm.departmentId"
            :options="mixedDepartmentOptions"
            :disabled="mixedDepartmentDisabled"
            allow-clear
            placeholder="学院"
            style="width: 160px"
          />
          <UiInput
            size="sm"
            v-model="mixedFilterForm.academicYear"
            clearable
            placeholder="学年"
            style="width: 140px"
          />
          <UiSelect
            size="sm"
            v-model="mixedFilterForm.semester"
            :options="SemesterOptions"
            allow-clear
            placeholder="学期"
            style="width: 120px"
          />
          <UiButton size="sm" variant="primary" @click="handleMixedSearch">查询</UiButton>
        </div>
        <UiDataTable
          v-model:current="mixedPagination.pageNum"
          v-model:page-size="mixedPagination.pageSize"
          pagination-mode="server"
          :columns="mixedColumns"
          :data-source="mixedRows"
          :loading="mixedLoading"
          :total="mixedPagination.total"
          flat
          row-key="sourceBatchId"
          size="middle"
          empty-description="暂无待复核混扫批次"
          @page-change="loadMixedBatches"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archiveNo'">
              <UiTextAction tone="primary" @click="goVolumeScanReview(record.volumeId)">
                {{ record.archiveNo || record.volumeId }}
              </UiTextAction>
            </template>
            <template v-else-if="column.key === 'scanEndTime'">
              {{ formatDateTime(record.scanEndTime) }}
            </template>
            <template v-else-if="column.key === 'updateTime'">
              {{ formatDateTime(record.updateTime) }}
            </template>
          </template>
        </UiDataTable>
      </div>
    </WorkbenchSurfaceCard>
    <UiDialog
      v-model:open="campaignPickOpen"
      title="选择迎评批次"
      ok-text="确认"
      cancel-text="取消"
      @ok="confirmCampaignPick"
    >
      <p v-if="campaignPickTruncated" class="archive-eval-campaign__pick-hint">
        命中批次较多，仅展示部分结果，请手动选择。
      </p>
      <UiRadioGroup
        v-model="campaignPickPendingId"
        class="archive-eval-campaign__pick-group"
        size="sm"
        block
      >
        <UiRadio
          v-for="item in pendingCampaignOptions"
          :key="item.campaignId"
          :value="item.campaignId"
          class="archive-eval-campaign__pick-item"
        >
          {{ item.campaignName }}
        </UiRadio>
      </UiRadioGroup>
    </UiDialog>
    <ArchiveEvaluationExportTaskModal />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveEvaluationCampaignResolveItemVO,
  ArchiveEvaluationCampaignResponse,
  ArchiveEvaluationCampaignScopeSummaryVO,
  ArchiveEvaluationCampaignStatsVO,
  ArchiveEvaluationVolumeReadinessResponse,
  ArchiveSuspectedMixedScanBatchItemVO,
} from '@/apis/mark/archive-volume'
import type {
  BadgeTone,
  UiSectionTabItem,
  UiTableRowActionItem,
} from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
  ArchiveEvaluationCampaignStatusCode,
  ArchiveEvaluationCampaignStatusDescription,
  exportEvaluationArchivePackage,
  exportEvaluationPackage,
  getEvaluationCampaignReadinessPanel,
  getEvaluationCampaignStats,
  pageEvaluationCampaigns,
  pageSuspectedMixedScanBatches,
  resolveEvaluationCampaignByVolume,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import ArchiveEvalCampaignScopeSummary from '@/components/archive-volume/ArchiveEvalCampaignScopeSummary.vue'
import ArchiveReadinessRateBar from '@/components/archive-volume/ArchiveReadinessRateBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiRadio from '@/components/ui-guide/ui/UiRadio.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { runArchiveEvaluationExportFlow } from '@/composables/useArchiveEvaluationExportFlow'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ArchiveVolumeDetailTabKey } from '@/constants/archive-volume-detail-tabs'
import { DEFAULT_LIST_PAGE_SIZE, EXPORT_PAGE_SIZE } from '@/constants/pagination'
import { ArchiveEvaluationCampaignScopeMatchKindCode } from '@/types/enums/archive-evaluation-campaign-scope-match-kind-enum'
import {
  ArchiveEvaluationDimensionReadyCode,
  ArchiveEvaluationDimensionReadyDescription,
  ArchiveEvaluationDimensionReadyTone,
} from '@/types/enums/archive-evaluation-dimension-ready-enum'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { ensureAcademicYearSemesterPair } from '@/utils/academic-year-semester-query'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveEvaluationExportTaskModal from '@/views/teacher/archive-volume/components/ArchiveEvaluationExportTaskModal.vue'

defineOptions({ name: 'TeacherArchiveVolumeEvalCampaign' })

type EvalCampaignTabKey = 'list' | 'readiness' | 'mixed-review'

const router = useRouter()
const route = useRoute()
const { loadGrants, listScopedDepartmentIds, isTenantWideCollegeCoordinator }
  = useArchiveDutyAccess()

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
const onlyOpenRemediation = ref(false)
const scopeSummary = ref<ArchiveEvaluationCampaignScopeSummaryVO | null>(null)
const resolveHint = ref('')
const fromVolumeResolve = ref(false)
const readinessRows = ref<ArchiveEvaluationVolumeReadinessResponse[]>([])
const readinessPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const campaignPickOpen = ref(false)
const campaignPickTruncated = ref(false)
const campaignPickPendingId = ref<string>()
const pendingCampaignOptions = ref<ArchiveEvaluationCampaignResolveItemVO[]>([])
const focusVolumeDismissed = ref(false)
const mixedLoading = ref(false)
const mixedRows = ref<ArchiveSuspectedMixedScanBatchItemVO[]>([])
const mixedPagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const mixedFilterForm = reactive<{
  departmentId?: string
  academicYear?: string
  semester?: SemesterCode
}>({})
const mixedDepartmentOptions = ref<Array<{ value: string, label: string }>>([])

const focusVolumeId = computed(() => {
  const volumeId = route.query.volumeId
  return typeof volumeId === 'string' && volumeId ? volumeId : undefined
})

const readinessFocusVolumeId = computed(() =>
  focusVolumeDismissed.value ? undefined : focusVolumeId.value,
)

const mixedDepartmentDisabled = computed(() => listScopedDepartmentIds.value.length === 1)

/** MVR-318：与 BE requireTenantWideCollegeCoordinator 对齐；院系级协调人不可导出假可点 */
const canExportCampaign = computed(() => isTenantWideCollegeCoordinator.value)

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
          ? `去重卷 ${stats.totalVolumeCount} · 就绪率 ${stats.readinessRatePercent}%（多批次重叠按卷编号只计一次）`
          : undefined,
    },
  ]
})

const tabItems: UiSectionTabItem[] = [
  { key: 'list', label: '迎评批次' },
  { key: 'readiness', label: '卷就绪度' },
  { key: 'mixed-review', label: '待复核批次' },
]

const campaignOptions = computed(() =>
  campaignSelectOptions.value.map((item) => ({
    value: item.campaignId,
    label: item.campaignName,
  })),
)

const selectedCampaignMeta = computed(() =>
  campaignSelectOptions.value.find((item) => item.campaignId === selectedCampaignId.value),
)

const campaignColumns: ColumnsType<ArchiveEvaluationCampaignResponse> = [
  { title: '批次名称', dataIndex: 'campaignName', key: 'campaignName', width: 200, fixed: 'left' },
  { title: '学年学期', key: 'term', width: 120 },
  { title: '状态', key: 'campaignStatus', width: 90 },
  { title: '总卷数', key: 'totalVolumeCount', width: 80, align: 'right' },
  { title: '就绪卷', key: 'readyVolumeCount', width: 80, align: 'right' },
  { title: '我的待整改', key: 'openRemediationTaskCount', width: 88, align: 'right' },
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

const mixedColumns: ColumnsType<ArchiveSuspectedMixedScanBatchItemVO> = [
  { title: '档案号', key: 'archiveNo', width: 150, fixed: 'left' },
  { title: '院系', dataIndex: 'departmentName', width: 140 },
  { title: '批次号', dataIndex: 'batchExternalNo', width: 140, ellipsis: true },
  { title: '材料数', dataIndex: 'materialCount', width: 72, align: 'right' },
  { title: '页数', dataIndex: 'pageCount', width: 72, align: 'right' },
  { title: '扫描结束', key: 'scanEndTime', width: 150 },
  { title: '更新时间', key: 'updateTime', width: 150 },
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

function buildCampaignActions(_record: ArchiveEvaluationCampaignResponse): UiTableRowActionItem[] {
  return [
    { key: 'export-catalog', label: '目录包', tone: 'primary' },
    { key: 'export-entity', label: '实体包' },
  ]
}

function handleCampaignAction(key: string, record: ArchiveEvaluationCampaignResponse): void {
  // MVR-318：行动作入口与 canExportCampaign 同源
  if (!canExportCampaign.value) {
    void message.warning('仅全校学院协调人可导出迎评材料包')
    return
  }
  if (key === 'export-catalog') {
    void handleExportArchive(record)
    return
  }
  if (key === 'export-entity') {
    void handleExportEntity(record)
  }
}

function resolveReadinessTargetTab(record: ArchiveEvaluationVolumeReadinessResponse): {
  tab: ArchiveVolumeDetailTabKey
  remediationTaskId?: string
} {
  if (!record.overallReady && (record.openRemediationTaskCount ?? 0) > 0) {
    return {
      tab: ArchiveVolumeDetailTabKey.MATERIALS,
      remediationTaskId: record.primaryOpenRemediationTaskId,
    }
  }
  if (!record.catalogReady) {
    return { tab: ArchiveVolumeDetailTabKey.MATERIALS }
  }
  if (!record.integrityReady || !record.fourPropertyReady) {
    return { tab: ArchiveVolumeDetailTabKey.INTEGRITY }
  }
  if (!record.transferReady) {
    return { tab: ArchiveVolumeDetailTabKey.TRANSFER }
  }
  return { tab: ArchiveVolumeDetailTabKey.MATERIALS }
}

function buildReadinessActions(
  record: ArchiveEvaluationVolumeReadinessResponse,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (!record.overallReady) {
    actions.push({ key: 'handle', label: '去处理', tone: 'primary' })
  }
  if ((record.openRemediationTaskCount ?? 0) > 0) {
    actions.push({ key: 'remediation', label: '整改任务' })
  }
  actions.push({ key: 'detail', label: '查看卷' })
  return actions
}

function handleReadinessAction(
  key: string,
  record: ArchiveEvaluationVolumeReadinessResponse,
): void {
  if (key === 'handle') {
    const target = resolveReadinessTargetTab(record)
    goVolumeDetail(record.volumeId, target.tab, target.remediationTaskId)
    return
  }
  if (key === 'remediation' && record.primaryOpenRemediationTaskId) {
    goVolumeDetail(
      record.volumeId,
      ArchiveVolumeDetailTabKey.MATERIALS,
      record.primaryOpenRemediationTaskId,
    )
    return
  }
  if (key === 'detail') {
    goVolumeDetail(record.volumeId)
  }
}

function dismissReadinessVolumeFocus(): void {
  focusVolumeDismissed.value = true
  readinessPagination.pageNum = 1
  void loadReadinessVolumes()
}

function goVolumeDetail(
  volumeId: string,
  tab?: ArchiveVolumeDetailTabKey,
  remediationTaskId?: string,
): void {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: {
      ...(tab ? { tab } : {}),
      ...(remediationTaskId ? { remediationTaskId } : {}),
    },
  })
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
      !focusVolumeId.value
      && !fromVolumeResolve.value
      && !selectedCampaignId.value
      && campaignSelectOptions.value.length > 0
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

function handleOpenRemediationCountClick(record: ArchiveEvaluationCampaignResponse): void {
  selectedCampaignId.value = record.campaignId
  activeTab.value = 'readiness'
  onlyOpenRemediation.value = true
  readinessPagination.pageNum = 1
  void loadReadinessVolumes()
}

async function bootstrapFromVolumeQuery(volumeId: string): Promise<void> {
  fromVolumeResolve.value = true
  resolveHint.value = ''
  activeTab.value = 'readiness'
  try {
    const resolveResult = await resolveEvaluationCampaignByVolume({ volumeId })
    if (!resolveResult.campaigns.length) {
      resolveHint.value = '该卷未命中任何进行中迎评批次，请手动选择'
      showFormValidationMessage('未找到该卷所属的进行中迎评批次')
      selectedCampaignId.value = undefined
      readinessRows.value = []
      readinessPagination.total = 0
      scopeSummary.value = null
      return
    }
    const autoPick
      = !resolveResult.truncated
        && resolveResult.campaigns.length === 1
        && resolveResult.suggestedCampaignId
    if (autoPick) {
      selectedCampaignId.value = resolveResult.suggestedCampaignId
      readinessPagination.pageNum = 1
      await loadReadinessVolumes()
      return
    }
    if (resolveResult.truncated) {
      resolveHint.value = '该卷属于多个批次，请手动选择'
    }
    selectedCampaignId.value = undefined
    readinessRows.value = []
    readinessPagination.total = 0
    scopeSummary.value = null
    pendingCampaignOptions.value = resolveResult.campaigns
    campaignPickTruncated.value = resolveResult.truncated
    campaignPickPendingId.value = undefined
    campaignPickOpen.value = true
    if (resolveResult.truncated) {
      showFormValidationMessage('命中批次较多，请手动选择迎评批次')
    }
  } catch (error) {
    showUserError(error, '迎评批次反查失败')
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

function handleCampaignPageChange(page: { current: number, pageSize: number }): void {
  campaignPagination.pageNum = page.current
  campaignPagination.pageSize = page.pageSize
  void loadCampaigns()
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
    scopeSummary.value = null
    return
  }
  readinessLoading.value = true
  try {
    const result = await getEvaluationCampaignReadinessPanel({
      campaignId: selectedCampaignId.value,
      pageNum: readinessPagination.pageNum,
      pageSize: readinessPagination.pageSize,
      onlyOpenRemediation: onlyOpenRemediation.value || undefined,
      volumeId: readinessFocusVolumeId.value,
    })
    scopeSummary.value = result.scopeSummary
    readinessRows.value = result.volumePage.list
    readinessPagination.total = result.volumePage.total
    readinessPagination.pageNum = result.volumePage.pageNum
    readinessPagination.pageSize = result.volumePage.pageSize
  } catch (error) {
    showUserError(error, '卷就绪度加载失败')
    readinessRows.value = []
    readinessPagination.total = 0
    scopeSummary.value = null
  } finally {
    readinessLoading.value = false
  }
}

function parseEvalCampaignTab(value: unknown): EvalCampaignTabKey {
  if (value === 'readiness' || value === 'mixed-review') {
    return value
  }
  return 'list'
}

async function loadMixedDepartmentOptions(): Promise<void> {
  try {
    const departments = await departmentCatalogApi.list()
    const scopeIds = listScopedDepartmentIds.value
    const scoped
      = scopeIds.length > 0 ? departments.filter((item) => scopeIds.includes(item.id)) : departments
    mixedDepartmentOptions.value = scoped.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
    if (scopeIds.length === 1) {
      mixedFilterForm.departmentId = scopeIds[0]
    }
  } catch (error) {
    mixedDepartmentOptions.value = []
    showUserError(error, '混扫院系筛选项加载失败')
  }
}

function handleMixedSearch(): void {
  mixedPagination.pageNum = 1
  void loadMixedBatches()
}

function applyRouteTabQuery(): void {
  const tab = parseEvalCampaignTab(route.query.tab)
  if (tab !== 'list') {
    activeTab.value = tab
  }
}

function handleTabChange(key: string | number): void {
  const tabKey = parseEvalCampaignTab(key)
  void router.replace({
    name: route.name!,
    query: {
      ...route.query,
      tab: tabKey === 'list' ? undefined : tabKey,
    },
  })
  if (tabKey === 'readiness' && selectedCampaignId.value) {
    void loadReadinessVolumes()
  }
  if (tabKey === 'mixed-review') {
    void loadMixedBatches()
  }
}

async function loadMixedBatches(): Promise<void> {
  mixedLoading.value = true
  try {
    if (!ensureAcademicYearSemesterPair(mixedFilterForm.academicYear, mixedFilterForm.semester)) {
      return
    }
    const academicYear = mixedFilterForm.academicYear?.trim() || undefined
    const result = await pageSuspectedMixedScanBatches({
      pageNum: mixedPagination.pageNum,
      pageSize: mixedPagination.pageSize,
      departmentId: mixedFilterForm.departmentId,
      academicYear,
      semester: academicYear ? mixedFilterForm.semester : undefined,
    })
    mixedRows.value = result.list
    mixedPagination.total = result.total
    mixedPagination.pageNum = result.pageNum
    mixedPagination.pageSize = result.pageSize
  } catch (error) {
    showUserError(error, '待复核批次加载失败')
  } finally {
    mixedLoading.value = false
  }
}

function goVolumeScanReview(volumeId: string): void {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: ArchiveVolumeDetailTabKey.SCAN_REVIEW },
  })
}

watch(selectedCampaignId, (campaignId) => {
  if (!campaignId || activeTab.value !== 'readiness') {
    return
  }
  readinessPagination.pageNum = 1
  void loadReadinessVolumes()
})

watch(onlyOpenRemediation, () => {
  if (!selectedCampaignId.value || activeTab.value !== 'readiness') {
    return
  }
  readinessPagination.pageNum = 1
  void loadReadinessVolumes()
})

async function handleExportArchive(record: ArchiveEvaluationCampaignResponse): Promise<void> {
  // MVR-318：与 canExportCampaign / BE requireTenantWideCollegeCoordinator 二次拦截
  if (!canExportCampaign.value) {
    void message.warning('仅全校学院协调人可导出迎评材料包')
    return
  }
  if (exportingCampaignId.value) {
    return
  }
  await confirmAsync({
    title: '导出四级目录包',
    content: `将导出批次范围内四级目录结构包（元数据为主）。${ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT}`,
    type: 'warning',
    okText: '确认导出',
    onOk: async () => {
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
        return false
      } finally {
        exportingCampaignId.value = ''
      }
    },
  })
}

async function handleExportEntity(record: ArchiveEvaluationCampaignResponse): Promise<void> {
  // MVR-318：与 canExportCampaign / BE requireTenantWideCollegeCoordinator 二次拦截
  if (!canExportCampaign.value) {
    void message.warning('仅全校学院协调人可导出迎评材料包')
    return
  }
  if (exportingCampaignId.value) {
    return
  }
  await confirmAsync({
    title: '导出实体文件包',
    content: `将导出含便携文档等实体材料的完整文件包。${ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT}`,
    type: 'warning',
    okText: '确认导出',
    onOk: async () => {
      exportingCampaignId.value = record.campaignId
      try {
        await runArchiveEvaluationExportFlow({
          campaignId: record.campaignId,
          exportFn: exportEvaluationPackage,
          successMessage: '实体文件包导出成功',
          scopeHint: ARCHIVE_EVALUATION_EXPORT_SCOPE_HINT,
          campaignLabel: record.campaignName,
        })
      } catch (error) {
        showUserError(error, '导出实体文件包失败')
        return false
      } finally {
        exportingCampaignId.value = ''
      }
    },
  })
}

onMounted(async () => {
  await loadGrants()
  await loadMixedDepartmentOptions()
  applyRouteTabQuery()
  void loadCampaignStats()
  await loadCampaignOptions()
  await loadCampaigns()
  if (activeTab.value === 'mixed-review') {
    void loadMixedBatches()
  }
  if (focusVolumeId.value) {
    await bootstrapFromVolumeQuery(focusVolumeId.value)
  }
})

onActivated(() => {
  void loadCampaignStats()
  void loadCampaigns()
  if (activeTab.value === 'readiness' && selectedCampaignId.value) {
    void loadReadinessVolumes()
  }
  if (activeTab.value === 'mixed-review') {
    void loadMixedBatches()
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
    gap: var(--dp-space-component);
  }

  &__readiness-title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__focus-hint,
  &__resolve-hint {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__readiness-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__mixed-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__mixed-hint {
    margin: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__mono {
    font-variant-numeric: tabular-nums;
    font-family: var(--dp-font-family-code);

    &--strong {
      font-weight: 600;
    }
  }

  &__pick-hint {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__pick-group {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  &__pick-item {
    display: flex;
  }
}
</style>
