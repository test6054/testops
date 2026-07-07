<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="课程考核归档卷" :subtitle="contextBarSubtitle">
        <template #status>
          <UiTag tone="blue" size="sm">{{ currentListTabLabel }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" :loading="loading" @click="handleRefresh">
            刷新
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goSearch">
            全文检索
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goEvalCampaign">
            评估迎评
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goAccessPending">
            待审批查阅
          </UiButton>
          <UiButton v-if="canViewStatisticsKpi" variant="outline" size="sm" @click="goAudit">
            审计查询
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="showSignalBand" #signal>
      <SignalBand
        variant="tiles"
        :metrics="activeSignalMetrics"
        compact
        @metric-click="handleSignalMetricClick"
      />
    </template>

    <div class="archive-volume-list__root">
      <ArchiveSetupGuideBanner
        v-if="setupReadinessLoading || setupBlocking"
        :readiness="setupReadiness"
        :loading="setupReadinessLoading"
        class="archive-volume-list__setup-banner"
      />

      <UiSectionTabs
        v-if="showRoleTabs"
        v-model="listTab"
        :items="visibleListTabs"
        compact
        class="archive-volume-list__role-tabs"
      />

      <WorkbenchSurfaceCard v-if="listTab === 'supervision'" flush>
        <ArchiveVolumeSupervisionPanel />
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard v-else-if="listTab === 'remediation'" flush>
        <ArchiveVolumeRemediationPanel />
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard v-else-if="showVolumeListPanel" flush class="archive-volume-list__panel">
        <template #toolbar>
          <UiBatchActionBar
            v-if="listTab === 'college' && canRejectTransfer && selectedVolumeIds.length > 0"
            :selected-count="selectedVolumeIds.length"
            class="archive-volume-list__batch"
          >
            <UiButton size="sm" variant="outline" @click="openBatchReject">批量退回</UiButton>
          </UiBatchActionBar>

          <div
            v-if="showVolumeFilter"
            class="archive-volume-list__filter"
          >
            <UiFilterBar
              v-model="filterModel"
              :fields="filterFields"
              variant="panel"
              show-labels
              search-text="查询"
              @search="handleSearch"
              @reset="handleReset"
            />
          </div>

          <div v-if="showVolumeFilter" class="archive-volume-list__filter-actions">
            <UiButton
              v-if="hasDuty(ArchiveDutyTypeCode.COLLEGE_COORDINATOR)"
              size="sm"
              variant="outline"
              @click="importDrawerOpen = true"
            >
              外部导入
            </UiButton>
            <UiButton
              v-if="listTab === 'mine'"
              size="sm"
              variant="outline"
              @click="goCreateSupplement"
            >
              补录建卷
            </UiButton>
            <UiButton
              v-if="listTab === 'mine'"
              size="sm"
              variant="outline"
              @click="goCreateOffline"
            >
              离线创建
            </UiButton>
            <UiButton
              v-if="canViewStatisticsKpi"
              size="sm"
              variant="outline"
              @click="goStatistics"
            >
              导出统计
            </UiButton>
          </div>

          <div v-if="archiveListQuickFilter" class="archive-volume-list__quick-filter">
            <UiTag tone="blue" size="sm">{{ archiveQuickFilterLabel }}</UiTag>
            <UiTextAction @click="clearArchiveQuickFilter">清除筛选</UiTextAction>
          </div>

          <div v-if="listTab === 'mine'" class="archive-volume-list__scope-bar">
            <UiSectionTabs
              v-model="volumeScope"
              :items="volumeScopeTabs"
              compact
            />
          </div>

          <div
            v-if="visibleScenarioPresets.length > 0 && !setupBlocking"
            class="archive-volume-list__scenario-row"
          >
            <UiButton
              v-for="preset in visibleScenarioPresets"
              :key="preset.key"
              size="sm"
              :variant="activeScenario === preset.key ? 'primary' : 'outline'"
              @click="handleScenarioSelect(preset.key)"
            >
              {{ preset.label }}
            </UiButton>
          </div>

          <ArchiveVolumeMineRemediationBanner
            v-if="listTab === 'mine' && volumeScope === 'mine'"
            :tasks="openRemediationTasks"
            :loading="remediationLoading"
            class="archive-volume-list__alert"
            @go="goRemediationVolume"
          />
        </template>

        <UiDataTable
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :columns="tableColumns"
          :data-source="volumes"
          :loading="loading"
          :total="pagination.total"
          :row-selection="rowSelection"
          :row-class-name="volumeRowClassName"
          flat
          row-key="volumeId"
          size="middle"
          class="student-detail-table__data-table archive-volume-list__table"
          :empty-description="emptyDescription"
          @page-change="loadVolumes"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archiveNo'">
              <button type="button" class="link-cell" @click="goDetail(record.volumeId)">
                {{ record.archiveNo }}
              </button>
              <UiTag
                v-if="isArchiveVolumeListUrgent(record)"
                :tone="record.appraisalStatus === 'REMINDER_SENT' ? 'red' : 'orange'"
                size="sm"
                class="archive-volume-list__urgent-tag"
              >
                {{ record.appraisalStatus === 'REMINDER_SENT' ? '待鉴定' : '待处理' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'archiveTitle'">
              <span class="archive-volume-list__title">{{ record.archiveTitle }}</span>
              <div v-if="record.departmentName || record.teachingClassName" class="link-cell__sub">
                {{ [record.departmentName, record.teachingClassName].filter(Boolean).join(' · ') }}
              </div>
            </template>
            <template v-else-if="column.key === 'academicYear'">
              <span>{{ record.academicYear || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'semester'">
              <span>{{ record.semester ? formatSemester(record.semester) : '—' }}</span>
            </template>
            <template v-else-if="column.key === 'sourceType'">
              <UiTag :tone="sourceTypeTone(record.sourceType)" size="sm">
                {{ sourceTypeLabel(record.sourceType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'statusGroup'">
              <div class="multi-tag-row">
                <ArchiveDimPill
                  v-for="pill in buildArchiveVolumeDimPills(record)"
                  :key="`${pill.label}-${pill.tone}`"
                  :tone="pill.tone"
                  :label="pill.label"
                />
              </div>
            </template>
            <template v-else-if="column.key === 'retentionYears'">
              <span v-if="record.permanentRetention">永久</span>
              <span v-else-if="record.retentionYears != null">{{ record.retentionYears }} 年</span>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'archiveDueTime'">
              <span
                :class="{
                  'archive-volume-list__due--danger': record.appraisalStatus === 'REMINDER_SENT',
                }"
              >
                {{ formatDateTime(record.archiveDueTime) }}
              </span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <UiTextAction tone="primary" @click="goDetail(record.volumeId)">详情</UiTextAction>
                <UiTextAction
                  v-if="record.appraisalStatus === 'REMINDER_SENT'"
                  tone="primary"
                  @click="goAppraisal(record.volumeId)"
                >
                  鉴定
                </UiTextAction>
                <UiTextAction
                  v-if="
                    listTab === 'mine'
                      && volumeScope === 'mine'
                      && hasOpenRemediationForVolume(record.volumeId)
                  "
                  tone="primary"
                  @click="goRemediationVolumeByVolumeId(record.volumeId)"
                >
                  去整改
                </UiTextAction>
                <UiTextAction
                  v-if="canSubmitVolumeRow(record) && listTab === 'mine' && volumeScope === 'mine'"
                  @click="goDetail(record.volumeId)"
                >
                  提交归档
                </UiTextAction>
                <span
                  v-else-if="isSubmitBlockedByRemediation(record)"
                  title="存在进行中的整改任务，须完成整改后再提交归档"
                >
                  <UiTextAction tone="primary" disabled>提交归档</UiTextAction>
                </span>
                <UiTextAction v-if="shouldRemindVolume(record)" @click="remindVolume(record)">
                  催办
                </UiTextAction>
              </div>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <ArchiveVolumeListNextStepsPanel :variant="listNextStepsVariant" />
    </div>

    <UiDrawer
      :open="batchRejectOpen"
      title="批量退回"
      :width="520"
      :confirm-loading="batchRejecting"
      ok-text="确认退回"
      :hide-footer="false"
      @update:open="(v: boolean) => (batchRejectOpen = v)"
      @close="batchRejectOpen = false"
      @confirm="submitBatchReject"
    >
      <a-form layout="vertical">
        <a-form-item label="退回原因" required>
          <a-textarea v-model:value="batchRejectReason" :rows="3" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer v-model:open="importDrawerOpen" title="外部批量导入" width="580">
      <ArchiveVolumeExternalImportPanel @imported="handleImportCompleted" />
      <ArchiveVolumeHistoryImportPanel
        class="archive-volume-list__history-import"
        @imported="handleImportCompleted"
      />
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType, TableProps } from 'ant-design-vue/es/table'
import type { LocationQueryRaw } from 'vue-router'
import type {
  ArchiveAppraisalStatusCode,
  ArchiveIntegrityStatusCode,
  ArchiveRemediationTaskResponse,
  ArchiveVolumePageRequest,
  ArchiveVolumeResponse,
  ArchiveVolumeSourceTypeCode,
} from '@/apis/mark/archive-volume'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { ArchiveVolumeScenarioKey } from '@/composables/useArchiveVolumeFilterPresets'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArchiveDutyTypeCode } from '@/apis/mark/archive-config'
import {
  ARCHIVE_APPRAISAL_STATUS_OPTIONS,
  ARCHIVE_INTEGRITY_STATUS_OPTIONS,
  ARCHIVE_TRANSFER_STATUS_OPTIONS,
  ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS,
  ARCHIVE_VOLUME_SOURCE_TYPE_TONE,
  ARCHIVE_VOLUME_STATUS_OPTIONS,
  ArchiveTransferStatusCode,
  ArchiveVolumeSourceTypeDescription,
  ArchiveVolumeStatusCode,
  batchRejectArchiveVolumeTransfer,
  getArchiveVolumeStatistics,
  listOpenRemediationTasks,
  pageArchiveVolumes,
  pageOverdueArchiveVolumes,
  remindArchiveDue,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import ArchiveDimPill from '@/components/archive-volume/ArchiveDimPill.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiBatchActionBar from '@/components/ui-guide/ui/UiBatchActionBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { useArchiveTenantSetupReadiness } from '@/composables/useArchiveTenantSetupReadiness'
import { useArchiveVolumeFilterPresets } from '@/composables/useArchiveVolumeFilterPresets'
import { canSubmitArchiveVolumeRow } from '@/composables/useArchiveVolumeSubmitGate'
import { useUserStore } from '@/stores/modules/user'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  generateAcademicYearOptions,
  getDefaultAcademicYearAndSemester,
} from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { buildArchiveVolumeDimPills } from '@/utils/archive-dimension-pill'
import { isSecurityRemediationDiagnostic } from '@/utils/archive-remediation-diagnostic'
import {
  archiveVolumeListRowClassName,
  isArchiveVolumeListUrgent,
} from '@/utils/archive-volume-list-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeExternalImportPanel from '@/views/teacher/archive-volume/archive-volume-external-import-panel.vue'
import ArchiveVolumeHistoryImportPanel from '@/views/teacher/archive-volume/archive-volume-history-import-panel.vue'
import ArchiveVolumeRemediationPanel from '@/views/teacher/archive-volume/archive-volume-remediation-panel.vue'
import ArchiveVolumeSupervisionPanel from '@/views/teacher/archive-volume/archive-volume-supervision-panel.vue'
import ArchiveSetupGuideBanner from '@/views/teacher/archive-volume/components/ArchiveSetupGuideBanner.vue'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'
import ArchiveVolumeMineRemediationBanner from '@/views/teacher/archive-volume/components/ArchiveVolumeMineRemediationBanner.vue'

defineOptions({ name: 'TeacherArchiveVolumeList' })

type ListTabKey = 'mine' | 'college' | 'archive' | 'supervision' | 'remediation'
type ArchiveListQuickFilter = 'pending-transfer' | 'due-appraisal' | 'overdue'
type VolumeScopeKey = 'all' | 'mine'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const {
  readinessLoading: setupReadinessLoading,
  readiness: setupReadiness,
  loadReadiness: loadSetupReadiness,
  overallReady: isSetupOverallReady,
} = useArchiveTenantSetupReadiness()

const setupBlocking = computed(() => !isSetupOverallReady() && setupReadiness.value != null)

function resolveScenarioListTab(): 'mine' | 'college' | 'archive' {
  if (listTab.value === 'college' || listTab.value === 'archive') {
    return listTab.value
  }
  return 'mine'
}

const {
  activeScenario,
  visiblePresets: visibleScenarioPresets,
  selectScenario,
  clearScenario,
  buildScenarioRequest,
  filterScenarioRows,
} = useArchiveVolumeFilterPresets(() => resolveScenarioListTab())

const {
  grantsLoadFailed,
  canViewCollegeBoard,
  canViewArchiveReviewer,
  canViewSupervision,
  canRejectTransfer,
  canViewStatisticsKpi,
  hasDuty,
  loadGrants,
  scopedDepartmentIds,
  listScopedDepartmentIds,
  filterListDepartmentOptions,
} = useArchiveDutyAccess()

const currentUserId = computed(() => userStore.userInfo?.userId ?? '')

const listTab = ref<ListTabKey>('mine')
const listNextStepsVariant = computed<'remediation' | 'list'>(() =>
  listTab.value === 'remediation' ? 'remediation' : 'list',
)
const volumeScope = ref<VolumeScopeKey>('all')
const archiveListQuickFilter = ref<ArchiveListQuickFilter | null>(null)
const preserveIntegrityFailedFilter = ref(false)
const loading = ref(false)
const batchRejecting = ref(false)
const batchRejectOpen = ref(false)
const importDrawerOpen = ref(false)
const batchRejectReason = ref('')
const volumes = ref<ArchiveVolumeResponse[]>([])
const openRemediationTasks = ref<ArchiveRemediationTaskResponse[]>([])
const remediationLoading = ref(false)
const openRemediationVolumeIdSet = computed(
  () => new Set(openRemediationTasks.value.map((task) => task.volumeId)),
)
const selectedVolumeIds = ref<string[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })
const allDepartmentOptions = ref<Array<{ value: string, label: string }>>([])
const kpiCollectingCount = ref<number | string>('—')
const kpiPendingTransferCount = ref<number | string>('—')
const kpiMissingCount = ref<number | string>('—')
const kpiOverdueCount = ref<number | string>('—')
const kpiTotalCount = ref<number | string>('—')
const kpiStoredCount = ref<number | string>('—')
const kpiSubmittedCount = ref<number | string>('—')
const kpiDueAppraisalCount = ref<number | string>('—')
const remediationTabCount = ref(0)
const listOverviewKpisFailed = ref(false)
const filterExtras = reactive({
  integrityFailedOnly: false,
  archiveOverdueOnly: false,
})
const defaultYearSemester = getDefaultAcademicYearAndSemester()

interface ArchiveVolumeListFilterForm extends Record<string, unknown> {
  keyword: string
  studentNo: string
  studentName: string
  departmentId: string | undefined
  academicYear: string | undefined
  semester: SemesterCode | undefined
  sourceType: ArchiveVolumeSourceTypeCode | undefined
  volumeStatus: ArchiveVolumeStatusCode | undefined
  integrityStatus: ArchiveIntegrityStatusCode | undefined
  transferStatus: ArchiveTransferStatusCode | undefined
  appraisalStatus: ArchiveAppraisalStatusCode | undefined
}

const filterForm = reactive<ArchiveVolumeListFilterForm>({
  keyword: '',
  studentNo: '',
  studentName: '',
  departmentId: undefined,
  academicYear: defaultYearSemester.academicYear,
  semester: defaultYearSemester.semester,
  sourceType: undefined,
  volumeStatus: undefined,
  integrityStatus: undefined,
  transferStatus: undefined,
  appraisalStatus: undefined,
})
const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const visibleListTabs = computed(() => {
  const tabs: Array<{ key: ListTabKey, label: string, count?: number, badgeTone?: BadgeTone }> = [
    {
      key: 'mine',
      label: '我的归档卷',
      count: Number(kpiTotalCount.value) > 0 ? Number(kpiTotalCount.value) : undefined,
    },
  ]
  if (canViewCollegeBoard.value) {
    tabs.push({ key: 'college', label: '院系看板' })
  }
  if (canViewArchiveReviewer.value) {
    const archiveBadge
      = Number(kpiPendingTransferCount.value) + Number(kpiDueAppraisalCount.value)
    tabs.push({
      key: 'archive',
      label: '档案验收',
      count: archiveBadge > 0 ? archiveBadge : undefined,
      badgeTone: 'orange',
    })
  }
  if (canViewSupervision.value) {
    tabs.push({ key: 'supervision', label: '督导抽查' })
  }
  if (canViewCollegeBoard.value || canViewSupervision.value || hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN)) {
    tabs.push({
      key: 'remediation',
      label: '迎评整改',
      count: remediationTabCount.value > 0 ? remediationTabCount.value : undefined,
      badgeTone: 'orange',
    })
  }
  return tabs
})

const currentListTabLabel = computed(() => {
  return visibleListTabs.value.find((item) => item.key === listTab.value)?.label ?? '归档卷'
})

const contextBarSubtitle = computed(() => {
  const parts: string[] = []
  if (filterForm.academicYear) {
    parts.push(filterForm.academicYear)
  }
  if (filterForm.semester) {
    parts.push(formatSemester(filterForm.semester))
  }
  parts.push(currentListTabLabel.value)
  return parts.join(' · ')
})

const volumeScopeTabs: Array<{ key: VolumeScopeKey, label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'mine', label: '我的' },
]

const showRoleTabs = computed(() => visibleListTabs.value.length > 1)

const showVolumeListPanel = computed(
  () => listTab.value === 'mine' || listTab.value === 'college' || listTab.value === 'archive',
)

const archiveQuickFilterLabel = computed(() => {
  if (archiveListQuickFilter.value === 'pending-transfer') {
    return '快捷筛选：待验收移交'
  }
  if (archiveListQuickFilter.value === 'due-appraisal') {
    return '快捷筛选：到期鉴定'
  }
  if (archiveListQuickFilter.value === 'overdue') {
    return '快捷筛选：逾期卷'
  }
  return ''
})

const emptyDescription = computed(() => {
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    return '尚无我的归档卷，线上考试关考后将自动创建'
  }
  if (listTab.value === 'mine' && volumeScope.value === 'all') {
    return '当前筛选无归档卷'
  }
  if (archiveListQuickFilter.value === 'pending-transfer') {
    return '暂无待验收归档卷'
  }
  if (archiveListQuickFilter.value === 'due-appraisal') {
    return '暂无到期鉴定归档卷'
  }
  if (archiveListQuickFilter.value === 'overdue') {
    return '暂无逾期归档卷'
  }
  return '当前筛选无结果'
})

const showSignalBand = computed(() => showVolumeListPanel.value)

const hasActiveListFilters = computed(() =>
  Boolean(
    archiveListQuickFilter.value
    || filterForm.volumeStatus
    || filterForm.integrityStatus
    || filterForm.transferStatus
    || filterForm.appraisalStatus
    || filterExtras.integrityFailedOnly
    || filterExtras.archiveOverdueOnly,
  ),
)

const activeArchiveSignalKey = computed(() => {
  if (archiveListQuickFilter.value === 'due-appraisal') {
    return 'dueAppraisal'
  }
  if (archiveListQuickFilter.value === 'pending-transfer') {
    return 'pending'
  }
  if (archiveListQuickFilter.value === 'overdue') {
    return 'overdue'
  }
  if (filterExtras.integrityFailedOnly) {
    return 'missing'
  }
  if (filterForm.volumeStatus === 'STORED') {
    return 'stored'
  }
  if (filterForm.volumeStatus === 'SUBMITTED') {
    return 'submitted'
  }
  if (filterForm.volumeStatus === 'COLLECTING') {
    return 'collecting'
  }
  return null
})

function buildListOverviewMetric(
  key: string,
  label: string,
  value: number | string,
  tone: BadgeTone,
  countForClick: number,
): SignalMetric {
  const failed = listOverviewKpisFailed.value
  const isActive = activeArchiveSignalKey.value === key
  return {
    key,
    label,
    value: failed ? '—' : value,
    unit: '卷',
    tone,
    clickable: !failed && (countForClick > 0 || isActive || (key === 'total' && hasActiveListFilters.value)),
    active: isActive,
  }
}

const listOverviewSignalMetrics = computed<SignalMetric[]>(() => {
  const metrics: SignalMetric[] = [
    buildListOverviewMetric('total', '归档卷总数', kpiTotalCount.value, 'blue', Number(kpiTotalCount.value)),
    buildListOverviewMetric('stored', '已入库', kpiStoredCount.value, 'green', Number(kpiStoredCount.value)),
    buildListOverviewMetric('submitted', '已提交', kpiSubmittedCount.value, 'blue', Number(kpiSubmittedCount.value)),
    buildListOverviewMetric('collecting', '收集中', kpiCollectingCount.value, 'orange', Number(kpiCollectingCount.value)),
    buildListOverviewMetric(
      'dueAppraisal',
      '待鉴定',
      kpiDueAppraisalCount.value,
      Number(kpiDueAppraisalCount.value) > 0 ? 'orange' : 'gray',
      Number(kpiDueAppraisalCount.value),
    ),
  ]
  if (canViewArchiveReviewer.value) {
    metrics.push(buildListOverviewMetric(
      'pending',
      '待验收移交',
      kpiPendingTransferCount.value,
      Number(kpiPendingTransferCount.value) > 0 ? 'orange' : 'gray',
      Number(kpiPendingTransferCount.value),
    ))
  }
  if (canViewStatisticsKpi.value) {
    metrics.push(buildListOverviewMetric(
      'missing',
      '缺项材料',
      kpiMissingCount.value,
      Number(kpiMissingCount.value) > 0 ? 'red' : 'gray',
      Number(kpiMissingCount.value),
    ))
    metrics.push(buildListOverviewMetric(
      'overdue',
      '逾期卷',
      kpiOverdueCount.value,
      Number(kpiOverdueCount.value) > 0 ? 'red' : 'gray',
      Number(kpiOverdueCount.value),
    ))
  }
  return metrics.map((metric) =>
    metric.key === 'missing' ? { ...metric, unit: '项' } : metric,
  )
})

const activeSignalMetrics = computed(() => listOverviewSignalMetrics.value)

const appraisalFilterDisabled = computed(
  () => archiveListQuickFilter.value === 'due-appraisal',
)

const showVolumeFilter = computed(() => showVolumeListPanel.value)

const visibleDepartmentOptions = computed(() => {
  if (listTab.value === 'mine') {
    return allDepartmentOptions.value
  }
  return filterListDepartmentOptions(allDepartmentOptions.value)
})

const departmentFilterDisabled = computed(
  () => listTab.value !== 'mine' && listScopedDepartmentIds.value.length === 1,
)

const rowSelection = computed<TableProps['rowSelection']>(() => {
  if (listTab.value !== 'college' || !canRejectTransfer.value) return undefined
  return {
    selectedRowKeys: selectedVolumeIds.value,
    onChange: (keys: (string | number)[]) => {
      selectedVolumeIds.value = keys.map(String)
    },
  }
})

const academicYearOptions = computed(() =>
  generateAcademicYearOptions().map((year) => ({ label: year, value: year })),
)

const semesterOptions = computed(() =>
  SemesterOptions.map((item) => ({
    label: formatSemester(item.value),
    value: item.value,
  })),
)

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '档案号 / 标题' },
  { key: 'studentNo', label: '学号', type: 'input', placeholder: '按材料学号筛卷' },
  { key: 'studentName', label: '姓名', type: 'input', placeholder: '按材料姓名筛卷' },
  {
    key: 'academicYear',
    label: '学年',
    type: 'select',
    placeholder: '全部学年',
    options: academicYearOptions.value,
    allowClear: true,
  },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '全部学期',
    options: semesterOptions.value,
    allowClear: true,
  },
  {
    key: 'departmentId',
    label: '学院',
    type: 'select',
    options: visibleDepartmentOptions.value,
    allowClear: !departmentFilterDisabled.value,
    disabled: departmentFilterDisabled.value,
  },
  {
    key: 'sourceType',
    label: '来源',
    type: 'select',
    options: ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS,
    allowClear: true,
  },
  {
    key: 'volumeStatus',
    label: '卷状态',
    type: 'select',
    options: ARCHIVE_VOLUME_STATUS_OPTIONS,
    allowClear: true,
  },
  {
    key: 'integrityStatus',
    label: '完整性',
    type: 'select',
    options: ARCHIVE_INTEGRITY_STATUS_OPTIONS,
    allowClear: true,
  },
  {
    key: 'transferStatus',
    label: '移交状态',
    type: 'select',
    options: ARCHIVE_TRANSFER_STATUS_OPTIONS,
    allowClear: true,
  },
  {
    key: 'appraisalStatus',
    label: '鉴定状态',
    type: 'select',
    options: ARCHIVE_APPRAISAL_STATUS_OPTIONS,
    allowClear: true,
    disabled: appraisalFilterDisabled.value,
    placeholder: appraisalFilterDisabled.value ? '到期鉴定 Tab 已固定筛选' : undefined,
  },
])

const tableColumns = computed<ColumnsType<ArchiveVolumeResponse>>(() => [
  { title: '归档编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 200 },
  { title: '归档标题', key: 'archiveTitle', dataIndex: 'archiveTitle', width: 220 },
  { title: '学年', key: 'academicYear', width: 100 },
  { title: '学期', key: 'semester', width: 88 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '五维状态', key: 'statusGroup', width: 320 },
  { title: '保管期限', key: 'retentionYears', width: 90 },
  { title: '到期日', key: 'archiveDueTime', width: 160 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
])

function volumeRowClassName(record: ArchiveVolumeResponse): string {
  return archiveVolumeListRowClassName(record)
}

function sourceTypeTone(code: ArchiveVolumeSourceTypeCode): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_SOURCE_TYPE_TONE, code, 'sourceType')
}

function sourceTypeLabel(code: ArchiveVolumeSourceTypeCode) {
  return strictEnumLabel(ArchiveVolumeSourceTypeDescription, code, 'sourceType')
}

function canSubmitVolumeRow(record: ArchiveVolumeResponse) {
  return canSubmitArchiveVolumeRow(record, currentUserId.value)
}

function isSubmitBlockedByRemediation(record: ArchiveVolumeResponse) {
  if (listTab.value !== 'mine' || volumeScope.value !== 'mine') return false
  if (record.volumeStatus !== 'COLLECTING') return false
  if (record.responsibleUserId !== currentUserId.value) return false
  return record.hasBlockingRemediationForSubmit === true
}

function shouldRemindVolume(record: ArchiveVolumeResponse) {
  if (listTab.value !== 'college') return false
  if (record.volumeStatus !== 'COLLECTING') return false
  if (!record.archiveDueTime) return false
  return new Date(record.archiveDueTime).getTime() < Date.now()
}

async function loadDepartments() {
  try {
    const departments = await departmentCatalogApi.list()
    allDepartmentOptions.value = departments.map((item) => ({
      value: item.id,
      label: item.deptName,
    }))
    applyScopedDepartmentDefault()
  } catch (error) {
    showUserError(error)
  }
}

function applyScopedDepartmentDefault() {
  if (listTab.value === 'mine') {
    return
  }
  const scopeIds = listScopedDepartmentIds.value
  if (scopeIds.length === 1) {
    filterForm.departmentId = scopeIds[0]
    return
  }
  if (
    filterForm.departmentId
    && !visibleDepartmentOptions.value.some((item) => item.value === filterForm.departmentId)
  ) {
    filterForm.departmentId = undefined
  }
}

async function loadListOverviewKpis(): Promise<void> {
  if (!showVolumeListPanel.value || setupBlocking.value || grantsLoadFailed.value) {
    return
  }
  listOverviewKpisFailed.value = false
  try {
    const countBase = buildVolumeFilterRequest()
    delete countBase.integrityFailedOnly
    delete countBase.archiveOverdueOnly
    delete countBase.volumeStatus
    delete countBase.transferStatus
    delete countBase.appraisalStatus
    if (listTab.value === 'college' || listTab.value === 'archive') {
      const scopeIds
        = listTab.value === 'college' ? scopedDepartmentIds.value : listScopedDepartmentIds.value
      if (scopeIds.length === 1) {
        countBase.departmentId = scopeIds[0]
      }
    }
    const [
      totalResult,
      storedResult,
      submittedResult,
      collectingResult,
      dueAppraisalResult,
      pendingResult,
    ] = await Promise.all([
      pageArchiveVolumes({ ...countBase, pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({ ...countBase, volumeStatus: ArchiveVolumeStatusCode.STORED, pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({ ...countBase, volumeStatus: ArchiveVolumeStatusCode.SUBMITTED, pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({ ...countBase, volumeStatus: ArchiveVolumeStatusCode.COLLECTING, pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({ ...countBase, dueAppraisalOnly: true, pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({ ...countBase, transferStatus: ArchiveTransferStatusCode.PENDING_REVIEW, pageNum: 1, pageSize: 1 }),
    ])
    kpiTotalCount.value = Number(totalResult.total)
    kpiStoredCount.value = Number(storedResult.total)
    kpiSubmittedCount.value = Number(submittedResult.total)
    kpiCollectingCount.value = Number(collectingResult.total)
    kpiDueAppraisalCount.value = Number(dueAppraisalResult.total)
    kpiPendingTransferCount.value = Number(pendingResult.total)
    if (canViewStatisticsKpi.value) {
      const statsRequest: { departmentId?: string } = {}
      if (countBase.departmentId) {
        statsRequest.departmentId = countBase.departmentId
      }
      const stats = await getArchiveVolumeStatistics(statsRequest)
      kpiOverdueCount.value = stats.overdueVolumeCount
      kpiMissingCount.value = stats.missingMaterials.reduce(
        (sum, item) => sum + item.missingVolumeCount,
        0,
      )
    }
  } catch {
    listOverviewKpisFailed.value = true
    kpiTotalCount.value = '—'
    kpiStoredCount.value = '—'
    kpiSubmittedCount.value = '—'
    kpiCollectingCount.value = '—'
    kpiDueAppraisalCount.value = '—'
    kpiPendingTransferCount.value = '—'
  }
}

async function loadRemediationTabCount(): Promise<void> {
  if (
    !canViewCollegeBoard.value
    && !canViewSupervision.value
    && !hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN)
  ) {
    remediationTabCount.value = 0
    return
  }
  try {
    const tasks = await listOpenRemediationTasks()
    remediationTabCount.value = tasks.length
  } catch {
    remediationTabCount.value = 0
  }
}

function applyRouteQuery() {
  listTab.value = resolveListTabFromQuery()
  applySourceTypeFromQuery()
  stripScopeQueryFromRoute()
}

/** 全部/我的为页内表格切换，不写入 URL，避免同一列表出现两个地址。 */
function stripScopeQueryFromRoute() {
  if (route.query.scope === undefined) {
    return
  }
  const nextQuery: LocationQueryRaw = { ...route.query }
  delete nextQuery.scope
  void router.replace({ query: nextQuery })
}
function applySourceTypeFromQuery() {
  const parsed = ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS.find((option) => option.value === route.query.sourceType)?.value
  if (!parsed) return
  filterForm.sourceType = parsed
  if (canViewArchiveReviewer.value) {
    listTab.value = 'archive'
  }
}

function resolveListTabFromQuery(): ListTabKey {
  const raw = route.query.tab
  const tab = typeof raw === 'string' ? raw : 'mine'
  const matchedTab = visibleListTabs.value.find((item) => item.key === tab)
  if (matchedTab) {
    return matchedTab.key
  }
  return 'mine'
}

function resolvePeriodFilter(): Pick<ArchiveVolumePageRequest, 'academicYear' | 'semester'> {
  const query = buildOptionalAcademicYearSemesterQuery(filterForm.academicYear, filterForm.semester)
  return query ?? {}
}

function ensurePeriodFilterPair(): boolean {
  return ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)
}

/** 归档卷列表共用筛选条件（不含分页与 Tab 特化字段）。 */
function buildVolumeFilterRequest(): ArchiveVolumePageRequest {
  const periodFilter = resolvePeriodFilter()
  const request: ArchiveVolumePageRequest = {
    keyword: filterForm.keyword.trim() || undefined,
    studentNo: filterForm.studentNo.trim() || undefined,
    studentName: filterForm.studentName.trim() || undefined,
    departmentId: filterForm.departmentId,
    ...periodFilter,
    sourceType: filterForm.sourceType,
    volumeStatus: filterForm.volumeStatus,
    integrityStatus: filterForm.integrityStatus,
    transferStatus: filterForm.transferStatus,
    appraisalStatus: filterForm.appraisalStatus,
    integrityFailedOnly: filterExtras.integrityFailedOnly || undefined,
    archiveOverdueOnly: filterExtras.archiveOverdueOnly || undefined,
    ...buildScenarioRequest(),
  }
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    request.mineOnly = true
  }
  return request
}

async function loadVolumes() {
  if (setupBlocking.value) {
    volumes.value = []
    pagination.total = 0
    return
  }
  if (!showVolumeFilter.value) return
  if (grantsLoadFailed.value) return
  if (!ensurePeriodFilterPair()) {
    return
  }
  loading.value = true
  try {
    const isOverdueQuickFilter = archiveListQuickFilter.value === 'overdue'
    const periodFilter = resolvePeriodFilter()
    const request: ArchiveVolumePageRequest = isOverdueQuickFilter
      ? {
          keyword: filterForm.keyword.trim() || undefined,
          studentNo: filterForm.studentNo.trim() || undefined,
          studentName: filterForm.studentName.trim() || undefined,
          departmentId: filterForm.departmentId,
          ...periodFilter,
          pageNum: pagination.pageNum,
          pageSize: pagination.pageSize,
        }
      : {
          ...buildVolumeFilterRequest(),
          pageNum: pagination.pageNum,
          pageSize: pagination.pageSize,
        }
    if (!isOverdueQuickFilter && archiveListQuickFilter.value === 'pending-transfer') {
      request.transferStatus = ArchiveTransferStatusCode.PENDING_REVIEW
    }
    if (!isOverdueQuickFilter && archiveListQuickFilter.value === 'due-appraisal') {
      Object.assign(request, { dueAppraisalOnly: true })
    } else if (!isOverdueQuickFilter && filterForm.appraisalStatus) {
      request.appraisalStatus = filterForm.appraisalStatus
    }
    if (listTab.value === 'mine' && volumeScope.value === 'mine') {
      request.mineOnly = true
    }
    const result = isOverdueQuickFilter
      ? await pageOverdueArchiveVolumes(request)
      : await pageArchiveVolumes(request)
    volumes.value = filterScenarioRows(result.list)
    pagination.total = Number(result.total)
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
    if (showVolumeListPanel.value) {
      void loadListOverviewKpis()
    }
  } catch (error) {
    showUserError(error, '加载归档卷列表失败')
    volumes.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

async function initPage() {
  await loadGrants()
  if (grantsLoadFailed.value) {
    return
  }
  await loadDepartments()
}

function handleScenarioSelect(key: ArchiveVolumeScenarioKey) {
  selectScenario(key)
  pagination.pageNum = 1
  selectedVolumeIds.value = []
  void loadVolumes()
}

function handleSearch() {
  if (!ensurePeriodFilterPair()) {
    return
  }
  pagination.pageNum = 1
  void loadVolumes()
}

function handleImportCompleted() {
  void loadVolumes()
  void loadListOverviewKpis()
}

function clearArchiveQuickFilter() {
  archiveListQuickFilter.value = null
  pagination.pageNum = 1
  void loadVolumes()
}

function handleReset() {
  clearScenario()
  archiveListQuickFilter.value = null
  filterForm.keyword = ''
  filterForm.studentNo = ''
  filterForm.studentName = ''
  filterForm.departmentId = departmentFilterDisabled.value
    ? listScopedDepartmentIds.value[0]
    : undefined
  filterForm.academicYear = defaultYearSemester.academicYear
  filterForm.semester = defaultYearSemester.semester
  filterForm.sourceType = undefined
  filterForm.volumeStatus = undefined
  filterForm.integrityStatus = undefined
  filterForm.transferStatus = undefined
  filterForm.appraisalStatus = undefined
  filterExtras.integrityFailedOnly = false
  filterExtras.archiveOverdueOnly = false
  pagination.pageNum = 1
  selectedVolumeIds.value = []
  void loadVolumes()
}

function openBatchReject() {
  batchRejectReason.value = ''
  batchRejectOpen.value = true
}

async function submitBatchReject() {
  if (!batchRejectReason.value.trim()) {
    message.warning('请填写退回原因')
    return
  }
  if (selectedVolumeIds.value.length === 0) {
    message.warning('请选择归档卷')
    return
  }
  batchRejecting.value = true
  try {
    await batchRejectArchiveVolumeTransfer({
      volumeIds: selectedVolumeIds.value,
      rejectReason: batchRejectReason.value.trim(),
    })
    message.success('批量退回完成')
    batchRejectOpen.value = false
    selectedVolumeIds.value = []
    await loadVolumes()
  } catch (error) {
    showUserError(error)
  } finally {
    batchRejecting.value = false
  }
}

function goDetail(volumeId: string) {
  const record = volumes.value.find((item) => item.volumeId === volumeId)
  const query: LocationQueryRaw = {}
  if (
    archiveListQuickFilter.value === 'pending-transfer'
    || record?.transferStatus === 'PENDING_REVIEW'
  ) {
    query.tab = 'transfer'
  }
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: Object.keys(query).length > 0 ? query : undefined,
  })
}

function goAppraisal(volumeId: string): void {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: 'appraisal' },
  })
}

function goEvalCampaign(): void {
  void router.push({ name: 'TeacherArchiveVolumeEvalCampaign' })
}

function hasOpenRemediationForVolume(volumeId: string) {
  if (openRemediationVolumeIdSet.value.has(volumeId)) {
    return true
  }
  return volumes.value.some(
    (item) => item.volumeId === volumeId && item.hasOpenRemediationTask === true,
  )
}

function goRemediationVolume(task: ArchiveRemediationTaskResponse) {
  if (isSecurityRemediationDiagnostic(task.diagnosticCode)) {
    void router.push({
      name: 'TeacherArchiveVolumeDetail',
      params: { volumeId: task.volumeId },
      query: {
        tab: 'integrity',
        remediationTaskId: task.taskId,
      },
    })
    return
  }
  void router.push({
    name: 'TeacherArchiveVolumeRemediationDetail',
    params: { taskId: task.taskId },
  })
}

function goRemediationVolumeByVolumeId(volumeId: string) {
  const task = openRemediationTasks.value.find((item) => item.volumeId === volumeId)
  if (task) {
    goRemediationVolume(task)
    return
  }
  goDetail(volumeId)
}

function remindVolume(record: ArchiveVolumeResponse) {
  void (async () => {
    try {
      await remindArchiveDue(record.volumeId)
      message.success('催办通知已发送')
    } catch (error) {
      showUserError(error, '催办失败')
    }
  })()
}

async function loadOpenRemediationTasks() {
  if (listTab.value !== 'mine' || volumeScope.value !== 'mine') {
    openRemediationTasks.value = []
    remediationLoading.value = false
    return
  }
  remediationLoading.value = true
  try {
    openRemediationTasks.value = await listOpenRemediationTasks()
  } catch (error) {
    openRemediationTasks.value = []
    showUserError(error, '加载待整改任务失败')
  } finally {
    remediationLoading.value = false
  }
}

function goStatistics() {
  void router.push({ name: 'TeacherArchiveVolumeStatistics' })
}

function goAudit() {
  void router.push({ name: 'TeacherArchiveVolumeAudit' })
}

function goAccessPending(): void {
  void router.push({ name: 'TeacherArchiveVolumeAccessPending' })
}

function goSearch() {
  void router.push({ name: 'TeacherArchiveVolumeSearch' })
}

function handleRefresh(): void {
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    void loadOpenRemediationTasks()
  }
  if (showVolumeListPanel.value && !setupBlocking.value) {
    void loadVolumes()
    void loadListOverviewKpis()
  }
}

function goCreateSupplement() {
  void router.push({ name: 'TeacherArchiveVolumeCreateSupplement' })
}

function goCreateOffline() {
  void router.push({ name: 'TeacherArchiveVolumeCreateOffline' })
}

function clearArchiveListStatusFilters() {
  archiveListQuickFilter.value = null
  filterForm.volumeStatus = undefined
  filterForm.integrityStatus = undefined
  filterForm.transferStatus = undefined
  filterForm.appraisalStatus = undefined
  filterExtras.integrityFailedOnly = false
  filterExtras.archiveOverdueOnly = false
}

function reloadArchiveListAfterSignalFilter() {
  if (showVolumeListPanel.value && !setupBlocking.value && !grantsLoadFailed.value) {
    void loadVolumes()
  }
}

function handleSignalMetricClick(key: string) {
  pagination.pageNum = 1
  selectedVolumeIds.value = []

  if (key === 'total') {
    clearArchiveListStatusFilters()
    clearScenario()
    handleSearch()
    return
  }

  filterExtras.archiveOverdueOnly = false
  filterForm.integrityStatus = undefined
  filterForm.transferStatus = undefined
  filterForm.appraisalStatus = undefined

  if (key === 'stored') {
    archiveListQuickFilter.value = null
    filterExtras.integrityFailedOnly = false
    filterForm.volumeStatus = ArchiveVolumeStatusCode.STORED
    handleSearch()
    return
  }
  if (key === 'submitted') {
    archiveListQuickFilter.value = null
    filterExtras.integrityFailedOnly = false
    filterForm.volumeStatus = ArchiveVolumeStatusCode.SUBMITTED
    handleSearch()
    return
  }
  if (key === 'collecting') {
    archiveListQuickFilter.value = null
    filterExtras.integrityFailedOnly = false
    filterForm.volumeStatus = ArchiveVolumeStatusCode.COLLECTING
    if (listTab.value === 'archive') {
      listTab.value = 'mine'
      return
    }
    handleSearch()
    return
  }
  if (key === 'dueAppraisal') {
    filterExtras.integrityFailedOnly = false
    filterForm.volumeStatus = undefined
    archiveListQuickFilter.value = 'due-appraisal'
    if (listTab.value !== 'archive') {
      listTab.value = 'archive'
      return
    }
    reloadArchiveListAfterSignalFilter()
    return
  }
  if (key === 'pending') {
    filterExtras.integrityFailedOnly = false
    filterForm.volumeStatus = undefined
    archiveListQuickFilter.value = 'pending-transfer'
    if (listTab.value !== 'archive') {
      listTab.value = 'archive'
      return
    }
    reloadArchiveListAfterSignalFilter()
    return
  }
  if (key === 'missing') {
    if (!canViewStatisticsKpi.value) {
      return
    }
    archiveListQuickFilter.value = null
    preserveIntegrityFailedFilter.value = true
    filterExtras.integrityFailedOnly = true
    filterForm.volumeStatus = undefined
    if (listTab.value === 'archive') {
      listTab.value = 'college'
      return
    }
    handleSearch()
    return
  }
  if (key !== 'overdue') {
    return
  }
  if (!canViewCollegeBoard.value && !canViewArchiveReviewer.value) {
    return
  }
  filterExtras.integrityFailedOnly = false
  filterForm.volumeStatus = undefined
  archiveListQuickFilter.value = 'overdue'
  if (listTab.value !== 'archive') {
    listTab.value = 'archive'
    return
  }
  reloadArchiveListAfterSignalFilter()
}

watch(
  () => filterForm.academicYear,
  (academicYear) => {
    if (!academicYear?.trim()) {
      filterForm.semester = undefined
    }
  },
)

watch(listTab, (tab) => {
  if (tab !== 'archive') {
    archiveListQuickFilter.value = null
  }
  const nextQuery: LocationQueryRaw = { ...route.query, tab }
  delete nextQuery.scope
  void router.replace({ query: nextQuery })
  clearScenario()
  applyScopedDepartmentDefault()
  if (tab !== 'mine' && !preserveIntegrityFailedFilter.value) {
    filterExtras.integrityFailedOnly = false
    filterExtras.archiveOverdueOnly = false
  }
  preserveIntegrityFailedFilter.value = false
  pagination.pageNum = 1
  selectedVolumeIds.value = []
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    void loadOpenRemediationTasks()
  }
  if (showVolumeListPanel.value) {
    void loadVolumes()
  }
})

watch(volumeScope, (scope) => {
  if (listTab.value !== 'mine') {
    return
  }
  pagination.pageNum = 1
  selectedVolumeIds.value = []
  if (scope === 'mine') {
    void loadOpenRemediationTasks()
  } else {
    openRemediationTasks.value = []
    remediationLoading.value = false
  }
  void loadVolumes()
})

watch(visibleListTabs, (tabs) => {
  if (!tabs.some((item) => item.key === listTab.value)) {
    listTab.value = 'mine'
  }
})

onMounted(async () => {
  await initPage()
  applyRouteQuery()
  if (grantsLoadFailed.value) {
    return
  }
  await loadSetupReadiness()
  if (setupBlocking.value && setupReadiness.value?.historicalVolumeExists !== true) {
    void router.replace({
      path: '/teacher/archive-volumes/settings',
      query: { settingsTab: 'templateSets' },
    })
    return
  }
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    await loadOpenRemediationTasks()
  }
  if (showVolumeListPanel.value && !setupBlocking.value) {
    await loadVolumes()
    await loadListOverviewKpis()
    await loadRemediationTabCount()
  }
})
</script>

<style scoped>
.archive-volume-list__root {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-list__scenario-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-list__setup-banner {
  margin-bottom: 0;
}

.archive-volume-list__role-tabs :deep(.ui-section-tabs__content) {
  display: none;
}

.archive-volume-list__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-list__batch {
  margin-bottom: var(--dp-space-2, 8px);
}

.archive-volume-list__filter {
  width: 100%;
}

.archive-volume-list__filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
  justify-content: flex-end;
  width: 100%;
}

.archive-volume-list__quick-filter {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-list__scope-bar {
  display: flex;
  align-items: center;
}

.link-cell__sub {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}

.archive-volume-list__title {
  font-weight: 500;
  font-size: 13px;
}

.archive-volume-list__urgent-tag {
  margin-left: 4px;
  vertical-align: middle;
}

.archive-volume-list__due--danger {
  color: var(--dp-color-error, #dc2626);
  font-weight: 600;
}

.archive-volume-list__history-import {
  margin-top: var(--dp-space-4, 16px);
  padding-top: var(--dp-space-4, 16px);
  border-top: 1px solid var(--dp-border-light, #eef0f3);
}

:deep(.archive-volume-list__table) {
  .ant-table-tbody > tr.archive-volume-list__row--error > td:first-child {
    box-shadow: inset 3px 0 0 var(--dp-color-error, #dc2626);
  }

  .ant-table-tbody > tr.archive-volume-list__row--warning > td:first-child {
    box-shadow: inset 3px 0 0 var(--dp-color-warning, #d97706);
  }

  .ant-table-tbody > tr.archive-volume-list__row--info > td:first-child {
    box-shadow: inset 3px 0 0 var(--dp-blue-400, #60a5fa);
  }
}
</style>
