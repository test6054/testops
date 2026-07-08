<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="课程考核归档任务"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag tone="blue" size="sm">{{ currentListTabLabel }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="primary" size="sm" @click="goCreateArchiveTask">
            新建归档任务
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

      <WorkbenchSurfaceCard
        v-else-if="showVolumeListPanel"
        flush
        class="archive-volume-list__panel"
      >
        <template #toolbar>
          <UiBatchActionBar
            v-if="
              listTab === 'college' &&
              selectedVolumeIds.length > 0 &&
              (canRejectTransfer || canRemindArchiveDue)
            "
            :selected-count="selectedVolumeIds.length"
            class="archive-volume-list__batch"
          >
            <UiButton
              v-if="canRemindArchiveDue"
              size="sm"
              variant="outline"
              :loading="batchReminding"
              @click="batchRemindVolumes"
            >
              批量催办
            </UiButton>
            <UiButton v-if="canRejectTransfer" size="sm" variant="outline" @click="openBatchReject">
              批量退回
            </UiButton>
          </UiBatchActionBar>

          <div v-if="showVolumeFilter" class="archive-volume-list__filter">
            <UiFilterBar
              v-model="filterModel"
              :fields="filterFields"
              variant="plain"
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
            <UiButton v-if="canViewStatisticsKpi" size="sm" variant="outline" @click="goStatistics">
              导出统计
            </UiButton>
          </div>

          <div v-if="archiveListQuickFilter" class="archive-volume-list__quick-filter">
            <UiTag tone="blue" size="sm">{{ archiveQuickFilterLabel }}</UiTag>
            <UiTextAction @click="clearArchiveQuickFilter">清除筛选</UiTextAction>
          </div>

          <div v-if="listTab === 'mine'" class="archive-volume-list__scope-bar">
            <UiSectionTabs v-model="volumeScope" :items="volumeScopeTabs" compact />
          </div>

          <div v-if="visibleScenarioPresets.length > 0" class="archive-volume-list__scenario-row">
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
                v-if="isArchiveDueOverdue(record.archiveDueTime)"
                tone="red"
                size="sm"
                class="archive-volume-list__urgent-tag"
              >
                已逾期
              </UiTag>
              <UiTag
                v-else-if="isArchiveDueSoon(record.archiveDueTime)"
                tone="orange"
                size="sm"
                class="archive-volume-list__urgent-tag"
              >
                临期
              </UiTag>
              <UiTag
                v-else-if="isArchiveVolumeListUrgent(record)"
                :tone="record.appraisalStatus === 'REMINDER_SENT' ? 'red' : 'orange'"
                size="sm"
                class="archive-volume-list__urgent-tag"
              >
                {{ record.appraisalStatus === 'REMINDER_SENT' ? '待鉴定' : '待处理' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'archiveTitle'">
              <span class="archive-volume-list__title">{{ record.archiveTitle }}</span>
              <div
                v-if="record.courseName || record.departmentName || record.teachingClassName"
                class="link-cell__sub"
              >
                {{
                  [record.courseName, record.departmentName, record.teachingClassName]
                    .filter(Boolean)
                    .join(' · ')
                }}
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
                  'archive-volume-list__due--danger': isArchiveDueOverdue(record.archiveDueTime),
                  'archive-volume-list__due--warn': isArchiveDueSoon(record.archiveDueTime),
                }"
              >
                {{ formatDateTime(record.archiveDueTime) }}
              </span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildVolumeActions(record)"
                split
                @action="(key) => handleVolumeAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>
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

    <UiDrawer
      :open="deptRejectOpen"
      title="驳回院系审核"
      :width="480"
      :confirm-loading="deptRejecting"
      ok-text="确认驳回"
      :hide-footer="false"
      @update:open="(v: boolean) => (deptRejectOpen = v)"
      @close="deptRejectOpen = false"
      @confirm="confirmDeptRejectFromList"
    >
      <a-textarea v-model:value="deptRejectReason" :rows="4" placeholder="驳回原因" />
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
import { useRoute, useRouter } from 'vue-router'
import type {
  ArchiveAppraisalStatusCode,
  ArchiveIntegrityStatusCode,
  ArchiveRemediationTaskResponse,
  ArchiveVolumePageRequest,
  ArchiveVolumeResponse,
  ArchiveVolumeSourceTypeCode,
} from '@/apis/mark/archive-volume'
import {
  approveArchiveVolumeDepartmentReview,
  ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS,
  ARCHIVE_VOLUME_SOURCE_TYPE_TONE,
  ArchiveTransferStatusCode,
  ArchiveVolumeSourceTypeDescription,
  ArchiveVolumeStatusCode,
  batchRejectArchiveVolumeTransfer,
  getArchiveVolumeStatistics,
  listOpenRemediationTasks,
  pageArchiveVolumes,
  pageOverdueArchiveVolumes,
  previewArchiveVolumeSubmitChecklist,
  rejectArchiveVolumeDepartmentReview,
  remindArchiveDue,
  requestArchiveVolumeDepartmentReview,
  withdrawArchiveVolumeDepartmentReview,
} from '@/apis/mark/archive-volume'
import type { CourseListVO } from '@/apis/quality/user-catalog'
import { courseCatalogApi, departmentCatalogApi } from '@/apis/quality/user-catalog'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { ArchiveVolumeScenarioKey } from '@/composables/useArchiveVolumeFilterPresets'
import { useArchiveVolumeFilterPresets } from '@/composables/useArchiveVolumeFilterPresets'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ArchiveDutyTypeCode } from '@/apis/mark/archive-config'
import ArchiveDimPill from '@/components/archive-volume/ArchiveDimPill.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiBatchActionBar from '@/components/ui-guide/ui/UiBatchActionBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { resolveSubmitChecklistRoute } from '@/composables/useArchiveSubmitChecklistRouter'
import { canSubmitArchiveVolumeRow } from '@/composables/useArchiveVolumeSubmitGate'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  composeAcademicYear,
  generateAcademicYearStartOptions,
  getDefaultAcademicYearAndSemester,
  parseAcademicYearStart,
} from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { buildArchiveVolumeDimPills } from '@/utils/archive-dimension-pill'
import { isSecurityRemediationDiagnostic } from '@/utils/archive-remediation-diagnostic'
import {
  archiveVolumeListRowClassName,
  isArchiveDueOverdue,
  isArchiveDueSoon,
  isArchiveVolumeListUrgent,
} from '@/utils/archive-volume-list-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeExternalImportPanel from '@/views/teacher/archive-volume/archive-volume-external-import-panel.vue'
import ArchiveVolumeHistoryImportPanel from '@/views/teacher/archive-volume/archive-volume-history-import-panel.vue'
import ArchiveVolumeRemediationPanel from '@/views/teacher/archive-volume/archive-volume-remediation-panel.vue'
import ArchiveVolumeSupervisionPanel from '@/views/teacher/archive-volume/archive-volume-supervision-panel.vue'
import ArchiveVolumeMineRemediationBanner from '@/views/teacher/archive-volume/components/ArchiveVolumeMineRemediationBanner.vue'

defineOptions({ name: 'TeacherArchiveVolumeList' })

type ListTabKey = 'mine' | 'college' | 'archive' | 'supervision' | 'remediation'
type ArchiveListQuickFilter = 'pending-transfer' | 'due-appraisal' | 'overdue'
type VolumeScopeKey = 'all' | 'mine'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

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
} = useArchiveVolumeFilterPresets(() => resolveScenarioListTab())

const {
  canViewCollegeBoard,
  canViewArchiveReviewer,
  canViewSupervision,
  canRejectTransfer,
  canViewStatisticsKpi,
  canRemindArchiveDue,
  hasDuty,
  isDepartmentArchivistOnly,
  loadGrants,
  scopedDepartmentIds,
  listScopedDepartmentIds,
  filterListDepartmentOptions,
} = useArchiveDutyAccess()

const currentUserId = computed(() => userStore.userInfo?.userId ?? '')

const listTab = ref<ListTabKey>('mine')
const volumeScope = ref<VolumeScopeKey>('all')
const archiveListQuickFilter = ref<ArchiveListQuickFilter | null>(null)
const preserveIntegrityFailedFilter = ref(false)
const loading = ref(false)
const batchRejecting = ref(false)
const batchReminding = ref(false)
const batchRejectOpen = ref(false)
const deptRejectOpen = ref(false)
const deptRejectReason = ref('')
const deptRejectVolumeId = ref<string | null>(null)
const deptRejecting = ref(false)
const importDrawerOpen = ref(false)
const batchRejectReason = ref('')
const volumes = ref<ArchiveVolumeResponse[]>([])
const openRemediationTasks = ref<ArchiveRemediationTaskResponse[]>([])
const remediationLoading = ref(false)
const openRemediationVolumeIdSet = computed(
  () => new Set(openRemediationTasks.value.map((task) => task.volumeId)),
)
const selectedVolumeIds = ref<string[]>([])
const pagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const allDepartmentOptions = ref<Array<{ value: string; label: string }>>([])
const courseOptions = ref<Array<{ value: string; label: string }>>([])
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
const defaultAcademicYearStart = parseAcademicYearStart(defaultYearSemester.academicYear)

interface ArchiveVolumeListFilterForm extends Record<string, unknown> {
  keyword: string
  courseId: string | undefined
  departmentId: string | undefined
  academicYearStartYear: number | undefined
  academicYearEndYear: number | undefined
  semester: SemesterCode | undefined
  sourceType: ArchiveVolumeSourceTypeCode | undefined
  volumeStatus: ArchiveVolumeStatusCode | undefined
  integrityStatus: ArchiveIntegrityStatusCode | undefined
  transferStatus: ArchiveTransferStatusCode | undefined
  appraisalStatus: ArchiveAppraisalStatusCode | undefined
}

const filterForm = reactive<ArchiveVolumeListFilterForm>({
  keyword: '',
  courseId: undefined,
  departmentId: undefined,
  academicYearStartYear: defaultAcademicYearStart ?? undefined,
  academicYearEndYear: defaultAcademicYearStart != null ? defaultAcademicYearStart + 1 : undefined,
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
  const tabs: Array<{ key: ListTabKey; label: string; count?: number; badgeTone?: BadgeTone }> = [
    {
      key: 'mine',
      label: '我的归档任务',
      count: Number(kpiTotalCount.value) > 0 ? Number(kpiTotalCount.value) : undefined,
    },
  ]
  if (canViewCollegeBoard.value) {
    tabs.push({
      key: 'college',
      label: isDepartmentArchivistOnly.value ? '部门档案员看板' : '院系看板',
    })
  }
  if (canViewArchiveReviewer.value) {
    const archiveBadge = Number(kpiPendingTransferCount.value) + Number(kpiDueAppraisalCount.value)
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
  if (
    canViewCollegeBoard.value ||
    canViewSupervision.value ||
    hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN)
  ) {
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
  return visibleListTabs.value.find((item) => item.key === listTab.value)?.label ?? '归档任务'
})

const contextBarSubtitle = computed(() => {
  const parts: string[] = []
  if (filterForm.academicYearStartYear != null) {
    parts.push(composeAcademicYear(filterForm.academicYearStartYear))
  }
  if (filterForm.semester) {
    parts.push(formatSemester(filterForm.semester))
  }
  parts.push(currentListTabLabel.value)
  return parts.join(' · ')
})

const volumeScopeTabs: Array<{ key: VolumeScopeKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'mine', label: '我的' },
]

const showRoleTabs = computed(() => visibleListTabs.value.length > 1)

const showVolumeListPanel = computed(
  () => listTab.value === 'mine' || listTab.value === 'college' || listTab.value === 'archive',
)

const showSubmitInMine = computed(() => listTab.value === 'mine' && volumeScope.value === 'mine')

const archiveQuickFilterLabel = computed(() => {
  if (archiveListQuickFilter.value === 'pending-transfer') {
    return '快捷筛选：待验收移交'
  }
  if (archiveListQuickFilter.value === 'due-appraisal') {
    return '快捷筛选：到期鉴定'
  }
  if (archiveListQuickFilter.value === 'overdue') {
    return '快捷筛选：逾期任务'
  }
  return ''
})

const emptyDescription = computed(() => {
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    return '尚无我的归档任务，线上考试关考后将自动创建'
  }
  if (listTab.value === 'mine' && volumeScope.value === 'all') {
    return '当前筛选无归档任务'
  }
  if (archiveListQuickFilter.value === 'pending-transfer') {
    return '暂无待验收入库任务'
  }
  if (archiveListQuickFilter.value === 'due-appraisal') {
    return '暂无到期鉴定任务'
  }
  if (archiveListQuickFilter.value === 'overdue') {
    return '暂无逾期归档任务'
  }
  return '当前筛选无结果'
})

const showSignalBand = computed(() => showVolumeListPanel.value)

const hasActiveListFilters = computed(() =>
  Boolean(
    archiveListQuickFilter.value ||
    filterForm.volumeStatus ||
    filterForm.integrityStatus ||
    filterForm.transferStatus ||
    filterForm.appraisalStatus ||
    filterExtras.integrityFailedOnly ||
    filterExtras.archiveOverdueOnly,
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
    clickable:
      !failed && (countForClick > 0 || isActive || (key === 'total' && hasActiveListFilters.value)),
    active: isActive,
  }
}

const listOverviewSignalMetrics = computed<SignalMetric[]>(() => {
  const metrics: SignalMetric[] = [
    buildListOverviewMetric(
      'total',
      '归档任务总数',
      kpiTotalCount.value,
      'blue',
      Number(kpiTotalCount.value),
    ),
    buildListOverviewMetric(
      'stored',
      '已入库',
      kpiStoredCount.value,
      'green',
      Number(kpiStoredCount.value),
    ),
    buildListOverviewMetric(
      'submitted',
      '已提交',
      kpiSubmittedCount.value,
      'blue',
      Number(kpiSubmittedCount.value),
    ),
    buildListOverviewMetric(
      'collecting',
      '收集中',
      kpiCollectingCount.value,
      'orange',
      Number(kpiCollectingCount.value),
    ),
    buildListOverviewMetric(
      'dueAppraisal',
      '待鉴定',
      kpiDueAppraisalCount.value,
      Number(kpiDueAppraisalCount.value) > 0 ? 'orange' : 'gray',
      Number(kpiDueAppraisalCount.value),
    ),
  ]
  if (canViewArchiveReviewer.value) {
    metrics.push(
      buildListOverviewMetric(
        'pending',
        '待验收移交',
        kpiPendingTransferCount.value,
        Number(kpiPendingTransferCount.value) > 0 ? 'orange' : 'gray',
        Number(kpiPendingTransferCount.value),
      ),
    )
  }
  if (canViewStatisticsKpi.value) {
    metrics.push(
      buildListOverviewMetric(
        'missing',
        '缺项材料',
        kpiMissingCount.value,
        Number(kpiMissingCount.value) > 0 ? 'red' : 'gray',
        Number(kpiMissingCount.value),
      ),
    )
    metrics.push(
      buildListOverviewMetric(
        'overdue',
        '逾期任务',
        kpiOverdueCount.value,
        Number(kpiOverdueCount.value) > 0 ? 'red' : 'gray',
        Number(kpiOverdueCount.value),
      ),
    )
  }
  return metrics.map((metric) => (metric.key === 'missing' ? { ...metric, unit: '项' } : metric))
})

const activeSignalMetrics = computed(() => listOverviewSignalMetrics.value)

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
  if (listTab.value !== 'college') return undefined
  if (!canRejectTransfer.value && !canRemindArchiveDue.value) return undefined
  return {
    selectedRowKeys: selectedVolumeIds.value,
    onChange: (keys: (string | number)[]) => {
      selectedVolumeIds.value = keys.map(String)
    },
  }
})

const academicYearStartOptions = computed(() =>
  generateAcademicYearStartOptions().map((year) => ({
    label: `${year} 年`,
    value: year,
  })),
)

const semesterOptions = computed(() =>
  SemesterOptions.map((item) => ({
    label: formatSemester(item.value),
    value: item.value,
  })),
)

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '归档编号 / 标题' },
  {
    key: 'courseId',
    label: '课程',
    type: 'select',
    placeholder: '全部课程',
    options: courseOptions.value,
    allowClear: true,
  },
  {
    key: 'academicYearStartYear',
    label: '学年',
    type: 'select',
    placeholder: '全部学年',
    options: academicYearStartOptions.value,
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
  const submittableStatus = record.departmentReviewEnabled
    ? record.volumeStatus === 'DEPARTMENT_REVIEWED'
    : record.volumeStatus === 'COLLECTING'
  if (!submittableStatus) return false
  if (record.canSubmitVolume !== true) return false
  return record.hasBlockingRemediationForSubmit === true
}

function shouldRemindVolume(record: ArchiveVolumeResponse) {
  if (listTab.value !== 'college' || !canRemindArchiveDue.value) return false
  const remindable =
    record.volumeStatus === 'COLLECTING' ||
    record.volumeStatus === 'DRAFT' ||
    record.volumeStatus === 'DEPARTMENT_REVIEW_PENDING' ||
    record.volumeStatus === 'DEPARTMENT_REVIEWED'
  if (!remindable) return false
  if (!record.archiveDueTime) return false
  return isArchiveDueOverdue(record.archiveDueTime) || isArchiveDueSoon(record.archiveDueTime)
}

function buildVolumeActions(record: ArchiveVolumeResponse): UiTableRowActionItem[] {
  const submitBlocked = isSubmitBlockedByRemediation(record)
  const canSubmit = canSubmitVolumeRow(record)
  return [
    { key: 'detail', label: '详情', tone: 'primary' },
    {
      key: 'appraisal',
      label: '鉴定',
      tone: 'primary',
      hidden: record.appraisalStatus !== 'REMINDER_SENT',
    },
    {
      key: 'remediation',
      label: '去整改',
      tone: 'primary',
      hidden: !showSubmitInMine.value || !hasOpenRemediationForVolume(record.volumeId),
    },
    {
      key: 'dept-review',
      label: '发起院系审核',
      tone: 'primary',
      hidden: !showSubmitInMine.value || record.canRequestDepartmentReview !== true,
    },
    {
      key: 'dept-approve',
      label: '审核通过',
      tone: 'primary',
      hidden:
        record.canApproveDepartmentReview !== true ||
        record.volumeStatus !== ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING,
    },
    {
      key: 'dept-reject',
      label: '驳回',
      tone: 'danger',
      hidden:
        record.canApproveDepartmentReview !== true ||
        record.volumeStatus !== ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING,
    },
    {
      key: 'dept-withdraw',
      label: '撤回审核',
      tone: 'primary',
      hidden: !showSubmitInMine.value || record.canWithdrawDepartmentReview !== true,
    },
    {
      key: 'submit',
      label: '提交归档',
      hidden: !showSubmitInMine.value || (!canSubmit && !submitBlocked),
      disabled: submitBlocked,
    },
    { key: 'remind', label: '催办', hidden: !shouldRemindVolume(record) },
  ]
}

function handleVolumeAction(key: string, record: ArchiveVolumeResponse): void {
  switch (key) {
    case 'detail':
      goDetail(record.volumeId)
      break
    case 'appraisal':
      goAppraisal(record.volumeId)
      break
    case 'remediation':
      goRemediationVolumeByVolumeId(record.volumeId)
      break
    case 'dept-review':
      void requestDepartmentReviewFromList(record)
      break
    case 'dept-approve':
      void approveDepartmentReviewFromList(record)
      break
    case 'dept-reject':
      openDeptRejectDrawer(record.volumeId)
      break
    case 'dept-withdraw':
      void withdrawDepartmentReviewFromList(record)
      break
    case 'submit':
      goDetailWithSubmitIntent(record.volumeId)
      break
    case 'remind':
      remindVolume(record)
      break
  }
}

async function loadCourses() {
  try {
    const courses = await courseCatalogApi.authorizedList()
    courseOptions.value = courses.map((item: CourseListVO) => ({
      value: item.id,
      label: item.courseName,
    }))
  } catch (error) {
    showUserError(error)
  }
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
    filterForm.departmentId &&
    !visibleDepartmentOptions.value.some((item) => item.value === filterForm.departmentId)
  ) {
    filterForm.departmentId = undefined
  }
}

async function loadListOverviewKpis(): Promise<void> {
  if (!showVolumeListPanel.value) {
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
      const scopeIds = listScopedDepartmentIds.value
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
      pageArchiveVolumes({
        ...countBase,
        volumeStatus: ArchiveVolumeStatusCode.STORED,
        pageNum: 1,
        pageSize: 1,
      }),
      pageArchiveVolumes({
        ...countBase,
        volumeStatus: ArchiveVolumeStatusCode.SUBMITTED,
        pageNum: 1,
        pageSize: 1,
      }),
      pageArchiveVolumes({
        ...countBase,
        volumeStatus: ArchiveVolumeStatusCode.COLLECTING,
        pageNum: 1,
        pageSize: 1,
      }),
      pageArchiveVolumes({ ...countBase, dueAppraisalOnly: true, pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({
        ...countBase,
        transferStatus: ArchiveTransferStatusCode.PENDING_REVIEW,
        pageNum: 1,
        pageSize: 1,
      }),
    ])
    kpiTotalCount.value = totalResult.total
    kpiStoredCount.value = storedResult.total
    kpiSubmittedCount.value = submittedResult.total
    kpiCollectingCount.value = collectingResult.total
    kpiDueAppraisalCount.value = dueAppraisalResult.total
    kpiPendingTransferCount.value = pendingResult.total
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
    !canViewCollegeBoard.value &&
    !canViewSupervision.value &&
    !hasDuty(ArchiveDutyTypeCode.ARCHIVE_ADMIN)
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
  const parsed = ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS.find(
    (option) => option.value === route.query.sourceType,
  )?.value
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
  const academicYear =
    filterForm.academicYearStartYear != null
      ? composeAcademicYear(filterForm.academicYearStartYear)
      : undefined
  const query = buildOptionalAcademicYearSemesterQuery(academicYear, filterForm.semester)
  return query ?? {}
}

function ensurePeriodFilterPair(): boolean {
  const academicYear =
    filterForm.academicYearStartYear != null
      ? composeAcademicYear(filterForm.academicYearStartYear)
      : undefined
  return ensureAcademicYearSemesterPair(academicYear, filterForm.semester)
}

/** 归档卷列表共用筛选条件（不含分页与 Tab 特化字段）。 */
function buildVolumeFilterRequest(): ArchiveVolumePageRequest {
  const periodFilter = resolvePeriodFilter()
  const request: ArchiveVolumePageRequest = {
    keyword: filterForm.keyword.trim() || undefined,
    courseId: filterForm.courseId || undefined,
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
  if (!showVolumeFilter.value) return
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
          courseId: filterForm.courseId || undefined,
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
    volumes.value = result.list
    pagination.total = result.total
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
    if (showVolumeListPanel.value) {
      void loadListOverviewKpis()
    }
  } catch (error) {
    showUserError(error, '加载归档任务列表失败')
    volumes.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

async function initPage() {
  void loadGrants()
  await Promise.all([loadDepartments(), loadCourses()])
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
  filterForm.courseId = undefined
  filterForm.departmentId = departmentFilterDisabled.value
    ? listScopedDepartmentIds.value[0]
    : undefined
  const defaultStart = parseAcademicYearStart(defaultYearSemester.academicYear)
  filterForm.academicYearStartYear = defaultStart ?? undefined
  filterForm.academicYearEndYear = defaultStart != null ? defaultStart + 1 : undefined
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
    message.warning('请选择归档任务')
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

function goDetail(volumeId: string, tab?: string) {
  const record = volumes.value.find((item) => item.volumeId === volumeId)
  const query: LocationQueryRaw = {}
  if (tab) {
    query.tab = tab
  } else if (
    archiveListQuickFilter.value === 'pending-transfer' ||
    record?.transferStatus === 'PENDING_REVIEW'
  ) {
    query.tab = 'transfer'
  }
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: Object.keys(query).length > 0 ? query : undefined,
  })
}

function goDetailWithTab(volumeId: string, tab: string) {
  goDetail(volumeId, tab)
}

function goDetailWithSubmitIntent(volumeId: string) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: 'transfer', submitIntent: '1' },
  })
}

function goAppraisal(volumeId: string): void {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: 'appraisal' },
  })
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

async function approveDepartmentReviewFromList(record: ArchiveVolumeResponse) {
  try {
    await approveArchiveVolumeDepartmentReview({ volumeId: record.volumeId })
    message.success('院系审核已通过')
    await loadVolumes()
  } catch (error) {
    showUserError(error, '院系审核通过失败')
  }
}

async function requestDepartmentReviewFromList(record: ArchiveVolumeResponse) {
  if (record.submitReady !== true) {
    await goDetailForSubmitBlocker(record.volumeId)
    return
  }
  try {
    await requestArchiveVolumeDepartmentReview({ volumeId: record.volumeId })
    message.success('已发起院系审核')
    await loadVolumes()
  } catch (error) {
    showUserError(error, '发起院系审核失败')
    await goDetailForSubmitBlocker(record.volumeId)
  }
}

async function goDetailForSubmitBlocker(volumeId: string) {
  try {
    const preview = await previewArchiveVolumeSubmitChecklist({ volumeId })
    const blocker = preview.blockingItems?.find((item) => !item.passed)
    if (blocker) {
      const routeTarget = resolveSubmitChecklistRoute(blocker)
      goDetailWithTab(volumeId, routeTarget.detailTabKey)
      return
    }
  } catch {
    // 预览失败时仍进入详情首屏
  }
  goDetail(volumeId)
}

function openDeptRejectDrawer(volumeId: string) {
  deptRejectVolumeId.value = volumeId
  deptRejectReason.value = ''
  deptRejectOpen.value = true
}

async function confirmDeptRejectFromList() {
  const volumeId = deptRejectVolumeId.value
  const reason = deptRejectReason.value.trim()
  if (!volumeId || !reason) {
    message.warning('请填写驳回原因')
    return
  }
  deptRejecting.value = true
  try {
    await rejectArchiveVolumeDepartmentReview({ volumeId, rejectReason: reason })
    message.success('院系审核已驳回')
    deptRejectOpen.value = false
    await loadVolumes()
  } catch (error) {
    showUserError(error, '院系审核驳回失败')
  } finally {
    deptRejecting.value = false
  }
}

async function withdrawDepartmentReviewFromList(record: ArchiveVolumeResponse) {
  try {
    await withdrawArchiveVolumeDepartmentReview({ volumeId: record.volumeId })
    message.success('已撤回院系审核，可继续补件')
    await loadVolumes()
  } catch (error) {
    showUserError(error, '撤回院系审核失败')
  }
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

function batchRemindVolumes() {
  const targets = volumes.value.filter(
    (row) => selectedVolumeIds.value.includes(row.volumeId) && shouldRemindVolume(row),
  )
  if (targets.length === 0) {
    message.warning('所选任务均不可催办（须收材中且临期或逾期）')
    return
  }
  void (async () => {
    batchReminding.value = true
    let successCount = 0
    try {
      for (const row of targets) {
        await remindArchiveDue(row.volumeId)
        successCount += 1
      }
      message.success(`已向 ${successCount} 个任务发送催办`)
      selectedVolumeIds.value = []
    } catch (error) {
      if (successCount > 0) {
        message.warning(`部分催办已发送（${successCount}/${targets.length}）`)
      } else {
        showUserError(error, '批量催办失败')
      }
    } finally {
      batchReminding.value = false
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

function goCreateArchiveTask() {
  void router.push({ name: 'TeacherCreateArchiveTask' })
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
  if (showVolumeListPanel.value) {
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
  () => filterForm.academicYearStartYear,
  (startYear) => {
    filterForm.academicYearEndYear = startYear != null ? startYear + 1 : undefined
    if (startYear == null) {
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
  if (route.query.openHistoryImport === '1') {
    importDrawerOpen.value = true
    const nextQuery: LocationQueryRaw = { ...route.query }
    delete nextQuery.openHistoryImport
    void router.replace({ query: nextQuery })
  }
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    await loadOpenRemediationTasks()
  }
  if (showVolumeListPanel.value) {
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
  gap: var(--dp-space-4);
}

.archive-volume-list__scenario-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-volume-list__role-tabs :deep(.ui-section-tabs__content) {
  display: none;
}

.archive-volume-list__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-volume-list__batch {
  margin-bottom: var(--dp-space-2);
}

.archive-volume-list__filter {
  width: 100%;
}

.archive-volume-list__filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  justify-content: flex-end;
  width: 100%;
}

.archive-volume-list__quick-filter {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-volume-list__scope-bar {
  display: flex;
  align-items: center;
}

.link-cell__sub {
  color: var(--dp-text-muted);
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
  color: var(--dp-color-error);
  font-weight: 600;
}

.archive-volume-list__due--warn {
  color: var(--dp-color-warning);
  font-weight: 600;
}

.archive-volume-list__history-import {
  margin-top: var(--dp-space-4);
  padding-top: var(--dp-space-4);
  border-top: 1px solid var(--dp-border-light);
}

:deep(.archive-volume-list__table) {
  .ant-table-tbody > tr.archive-volume-list__row--error > td:first-child {
    box-shadow: inset 3px 0 0 var(--dp-color-error);
  }

  .ant-table-tbody > tr.archive-volume-list__row--warning > td:first-child {
    box-shadow: inset 3px 0 0 var(--dp-color-warning);
  }

  .ant-table-tbody > tr.archive-volume-list__row--info > td:first-child {
    box-shadow: inset 3px 0 0 var(--dp-blue-400);
  }
}
</style>
