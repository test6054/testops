<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="课程考核归档" :subtitle="contextBarSubtitle">
        <template #status>
          <UiTag tone="blue" size="sm">{{ currentListTabLabel }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="primary" size="sm" @click="goCreateArchiveTask">
            新建课程考核袋
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goCreateHistorySupplement">
            历史补录
          </UiButton>
          <UiDropdownAction
            v-if="listMoreActionItems.length"
            trigger-style="button"
            button-text="更多"
            :items="listMoreActionItems"
            @select="onListMoreAction"
          />
        </template>
      </ContextBar>
    </template>

    <template v-if="showSignalBand" #signal>
      <SignalBand
        :metrics="activeSignalMetrics"
        variant="panel"
        @metric-click="handleSignalMetricClick"
      />
    </template>

    <div class="archive-volume-list__root">
      <ArchiveSetupGuideBanner
        :readiness="archiveSetupReadiness"
        :loading="archiveSetupReadinessLoading"
        :load-failed="archiveSetupReadinessLoadFailed"
        @retry="loadArchiveSetupReadiness"
      />

      <UiAlertStrip
        v-if="s1TipVisible"
        :tone="s1TipTone"
        :title="s1TipTitle"
        :description="s1TipDescription"
        dense
      >
        <template #actions>
          <UiButton
            v-if="s1PrimaryActionLabel"
            size="sm"
            :variant="s1TipTone === 'warning' ? 'primary' : 'outline'"
            @click="goS1PrimaryAction"
          >
            {{ s1PrimaryActionLabel }}
          </UiButton>
          <UiButton
            v-if="s1ShowExamListSecondary"
            size="sm"
            variant="outline"
            @click="goExamListForArchive"
          >
            考试列表
          </UiButton>
          <UiButton
            v-if="s1AttentionLoadFailed"
            size="sm"
            variant="outline"
            :loading="s1AttentionLoading"
            @click="loadS1AutoCreateAttention"
          >
            重试
          </UiButton>
        </template>
      </UiAlertStrip>

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
            v-if="listTab === 'college' && selectedVolumeIds.length > 0 && canRejectAnyOnPage"
            :selected-count="selectedVolumeIds.length"
            class="archive-volume-list__batch"
          >
            <UiButton
              v-if="canRejectAnyOnPage"
              size="sm"
              variant="outline"
              @click="openBatchReject"
            >
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
            :total-count="openRemediationTaskTotal"
            :loading="remediationLoading"
            @go="goRemediationVolume"
          />
        </template>

        <UiDataTable
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          pagination-mode="server"
          :columns="tableColumns"
          :data-source="listLoadFailed ? [] : volumes"
          :loading="loading"
          :total="pagination.total"
          :row-selection="rowSelection"
          :row-class-name="volumeRowClassName"
          flat
          row-key="volumeId"
          size="middle"
          class="archive-volume-list__table"
          :empty-description="emptyDescription"
          :load-error="listLoadFailed"
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
                v-else-if="
                  isArchiveDueSoon(record.archiveDueTime, record.archiveDueReminderLeadDays)
                "
                tone="orange"
                size="sm"
                class="archive-volume-list__urgent-tag"
              >
                临期
              </UiTag>
              <UiTag
                v-else-if="isArchiveVolumeListUrgent(record)"
                :tone="
                  record.appraisalStatus === ArchiveAppraisalStatusCode.REMINDER_SENT
                    ? 'red'
                    : 'orange'
                "
                size="sm"
                class="archive-volume-list__urgent-tag"
              >
                {{
                  record.appraisalStatus === ArchiveAppraisalStatusCode.REMINDER_SENT
                    ? '待鉴定'
                    : '待处理'
                }}
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
                  'archive-volume-list__due--warn': isArchiveDueSoon(
                    record.archiveDueTime,
                    record.archiveDueReminderLeadDays,
                  ),
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
      <UiForm layout="vertical">
        <UiFormItem label="退回原因" required>
          <UiTextarea
            size="sm"
            v-model="batchRejectReason"
            :rows="3"
            :maxlength="500"
            :show-count="true"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <DepartmentReviewListDrawer
      :open="deptReviewDrawerOpen"
      :volume-id="deptReviewVolumeId"
      @update:open="(v: boolean) => (deptReviewDrawerOpen = v)"
      @completed="handleDeptReviewDrawerCompleted"
      @open-detail="goDetailWithTab"
    />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType, TableProps } from 'ant-design-vue/es/table'
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import type {
  ArchiveIntegrityStatusCode,
  ArchiveRemediationTaskResponse,
  ArchiveVolumePageRequest,
  ArchiveVolumeResponse,
  ArchiveVolumeSourceTypeCode,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_VOLUME_SOURCE_TYPE_OPTIONS,
  ARCHIVE_VOLUME_SOURCE_TYPE_TONE,
  ArchiveAppraisalStatusCode,
  ArchiveTransferStatusCode,
  ArchiveVolumeSourceTypeDescription,
  ArchiveVolumeStatusCode,
  batchRejectArchiveVolumeTransfer,
  getArchiveVolumeStatistics,
  getOpenRemediationStats,
  pageArchiveVolumes,
  pageOpenRemediationTasks,
  pageOverdueArchiveVolumes,
  previewArchiveVolumeSubmitChecklist,
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
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import ArchiveDimPill from '@/components/archive-volume/ArchiveDimPill.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiBatchActionBar from '@/components/ui-guide/ui/UiBatchActionBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { useArchiveS1AutoCreateAttention } from '@/composables/useArchiveS1AutoCreateAttention'
import { resolveSubmitChecklistRoute } from '@/composables/useArchiveSubmitChecklistRouter'
import { useArchiveTenantSetupReadiness } from '@/composables/useArchiveTenantSetupReadiness'
import { canSubmitArchiveVolumeRow } from '@/composables/useArchiveVolumeSubmitGate'
import { confirmAsync } from '@/composables/useConfirmDialog'
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
import { fetchArchiveSuspectedMixedPendingTotal } from '@/utils/archive-suspected-mixed-navigation'
import {
  archiveVolumeListRowClassName,
  isArchiveDueOverdue,
  isArchiveDueSoon,
  isArchiveVolumeListUrgent,
} from '@/utils/archive-volume-list-ui'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeRemediationPanel from '@/views/teacher/archive-volume/archive-volume-remediation-panel.vue'
import ArchiveVolumeSupervisionPanel from '@/views/teacher/archive-volume/archive-volume-supervision-panel.vue'
import ArchiveSetupGuideBanner from '@/views/teacher/archive-volume/components/ArchiveSetupGuideBanner.vue'
import ArchiveVolumeMineRemediationBanner from '@/views/teacher/archive-volume/components/ArchiveVolumeMineRemediationBanner.vue'
import DepartmentReviewListDrawer from '@/views/teacher/archive-volume/components/DepartmentReviewListDrawer.vue'

defineOptions({ name: 'TeacherArchiveVolumeList' })

type ListTabKey = 'mine' | 'college' | 'archive' | 'supervision' | 'remediation'
type ArchiveListQuickFilter = 'pending-transfer' | 'due-appraisal' | 'overdue'
type VolumeScopeKey = 'all' | 'mine'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const {
  readinessLoading: archiveSetupReadinessLoading,
  readiness: archiveSetupReadiness,
  readinessLoadFailed: archiveSetupReadinessLoadFailed,
  loadReadiness: loadArchiveSetupReadiness,
} = useArchiveTenantSetupReadiness()

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
  canViewStatisticsKpi,
  canViewGlobalAudit,
  canViewDestructionLedger,
  canViewArchiveDepartmentQueue,
  isDepartmentArchivistOnly,
  grants,
  loadGrants,
  listScopedDepartmentIds,
  filterListDepartmentOptions,
} = useArchiveDutyAccess()

const currentUserId = computed(() => userStore.userInfo?.userId ?? '')

/** MVR-196：列表批量退回与详情移交双人制同源 */
function isTransferSubmitterSelf(record: ArchiveVolumeResponse): boolean {
  const submitUserId = record.transferSubmitUserId
  return Boolean(
    submitUserId && currentUserId.value && String(submitUserId) === String(currentUserId.value),
  )
}

const listTab = ref<ListTabKey>('mine')
const volumeScope = ref<VolumeScopeKey>('all')
const archiveListQuickFilter = ref<ArchiveListQuickFilter | null>(null)
const preserveIntegrityFailedFilter = ref(false)
const loading = ref(false)
const listLoadFailed = ref(false)
const batchRejecting = ref(false)
const batchRejectOpen = ref(false)
const withdrawingVolumeId = ref<string | null>(null)
const requestingDepartmentReviewVolumeId = ref<string | null>(null)
const remindingVolumeId = ref<string | null>(null)
const deptReviewDrawerOpen = ref(false)
const deptReviewVolumeId = ref<string | null>(null)
const batchRejectReason = ref('')
const volumes = ref<ArchiveVolumeResponse[]>([])

// MVR-333/343/352：仅认 BE 列表行 canRejectTransfer===true（职责+待验收+双人制）；禁止全局 hasDuty 假可写
// isTransferSubmitterSelf 为 FE 防御叠闸，与 BE applyVolumePageTransferRejectDualControl 同源
const canRejectAnyOnPage = computed(() =>
  volumes.value.some((row) => rowCanRejectTransfer(row) && !isTransferSubmitterSelf(row)),
)

function rowCanRejectTransfer(row: ArchiveVolumeResponse): boolean {
  return (
    row.canRejectTransfer === true &&
    row.volumeStatus === ArchiveVolumeStatusCode.SUBMITTED &&
    row.transferStatus === ArchiveTransferStatusCode.PENDING_REVIEW
  )
}

const openRemediationTasks = ref<ArchiveRemediationTaskResponse[]>([])
const openRemediationTaskTotal = ref(0)
// MVR-339：仅认 BE open-stats canViewRemediationTab===true
const canViewRemediationTabFromStats = ref(false)
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
const suspectedMixedPendingTotal = ref<number | null>(null)
const listOverviewKpisFailed = ref(false)
const {
  loading: s1AttentionLoading,
  loadFailed: s1AttentionLoadFailed,
  attentionExamCount: s1AttentionExamCount,
  tipVisible: s1TipVisible,
  tipTone: s1TipTone,
  tipTitle: s1TipTitle,
  tipDescription: s1TipDescription,
  primaryActionLabel: s1PrimaryActionLabel,
  showExamListSecondary: s1ShowExamListSecondary,
  load: loadS1AutoCreateAttention,
  goExamList: goExamListForArchive,
  goPrimaryAction: goS1PrimaryAction,
} = useArchiveS1AutoCreateAttention()
const filterExtras = reactive({
  integrityFailedOnly: false,
  archiveOverdueOnly: false,
  collectingPhaseOnly: false,
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
      label: '我的课程考核袋',
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
  // MVR-339：仅认 BE open-stats canViewRemediationTab===true；禁止 hasDuty 回退
  if (canViewRemediationTabFromStats.value) {
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
  return visibleListTabs.value.find((item) => item.key === listTab.value)?.label ?? '课程考核袋'
})

const suspectedMixedScanButtonLabel = computed(() => {
  if (suspectedMixedPendingTotal.value != null && suspectedMixedPendingTotal.value > 0) {
    return `混扫复核待办 (${suspectedMixedPendingTotal.value})`
  }
  return '混扫复核待办'
})

async function loadSuspectedMixedPendingTotal(): Promise<void> {
  await loadGrants()
  if (!canViewArchiveDepartmentQueue.value) {
    suspectedMixedPendingTotal.value = null
    return
  }
  try {
    suspectedMixedPendingTotal.value = await fetchArchiveSuspectedMixedPendingTotal({
      grants: grants.value,
    })
    if (suspectedMixedPendingTotal.value === 0) {
      suspectedMixedPendingTotal.value = null
    }
  } catch {
    suspectedMixedPendingTotal.value = null
  }
}

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
    const attention = s1AttentionExamCount.value
    if (!s1AttentionLoadFailed.value && attention > 0) {
      return `有 ${attention} 场线上考试待自动建袋，请先到考试工作台「归档复盘」处理；线下考核请点「新建课程考核袋」`
    }
    return '尚无课程考核袋。线上考试关考后将自动建袋；线下考核请点「新建课程考核袋」'
  }
  if (listTab.value === 'mine' && volumeScope.value === 'all') {
    return '当前筛选无课程考核袋'
  }
  if (archiveListQuickFilter.value === 'pending-transfer') {
    return '暂无待验收入库任务'
  }
  if (archiveListQuickFilter.value === 'due-appraisal') {
    return '暂无到期鉴定任务'
  }
  if (archiveListQuickFilter.value === 'overdue') {
    return '暂无逾期课程考核袋'
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
    filterExtras.archiveOverdueOnly ||
    filterExtras.collectingPhaseOnly,
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
  if (filterForm.volumeStatus === ArchiveVolumeStatusCode.SUBMITTED) {
    return 'submitted'
  }
  if (
    filterExtras.collectingPhaseOnly ||
    filterForm.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
  ) {
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
  const iconTone =
    tone === 'green'
      ? 'green'
      : tone === 'red'
        ? 'red'
        : tone === 'orange'
          ? 'orange'
          : tone === 'blue'
            ? 'blue'
            : 'gray'
  return {
    key,
    label,
    value: failed ? '—' : value,
    unit: '卷',
    tone,
    iconTone,
    helper: failed ? '计数暂不可用' : isActive ? '当前筛选' : '点击筛选',
    clickable:
      !failed && (countForClick > 0 || isActive || (key === 'total' && hasActiveListFilters.value)),
    active: isActive,
  }
}

const listOverviewSignalMetrics = computed<SignalMetric[]>(() => {
  const metrics: SignalMetric[] = [
    buildListOverviewMetric(
      'total',
      '课程考核袋总数',
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

  // S1 待自动建袋：真源 PENDING+MANUAL_REQUIRED；单位「场」；点击跳考试列表/归档复盘
  const s1Failed = s1AttentionLoadFailed.value
  const s1Count = s1AttentionExamCount.value
  const s1HasAttention = !s1Failed && s1Count > 0
  metrics.splice(1, 0, {
    key: 's1AutoCreate',
    label: '待自动建袋',
    value: s1Failed ? '—' : s1Count,
    unit: '场',
    tone: s1Failed || s1HasAttention ? 'orange' : 'gray',
    iconTone: s1Failed || s1HasAttention ? 'orange' : 'gray',
    helper: s1Failed
      ? '计数暂不可用，点击重试'
      : s1HasAttention
        ? '点击前往处理'
        : '暂无待建袋考试',
    clickable: s1Failed || s1HasAttention,
    active: false,
  })

  return metrics.map((metric) => {
    if (metric.key === 'missing') {
      return { ...metric, unit: '项' }
    }
    if (metric.key === 's1AutoCreate') {
      return { ...metric, unit: '场' }
    }
    return metric
  })
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
  if (listTab.value !== 'college' || !canRejectAnyOnPage.value) return undefined
  return {
    selectedRowKeys: selectedVolumeIds.value,
    onChange: (keys: (string | number)[]) => {
      selectedVolumeIds.value = keys.map(String)
    },
    getCheckboxProps: (record: ArchiveVolumeResponse) => ({
      // MVR-196/333/343：状态+能力+双人制均收口到 rowCanRejectTransfer / isTransferSubmitterSelf
      disabled: !rowCanRejectTransfer(record) || isTransferSubmitterSelf(record),
    }),
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
  { title: '归档编号', key: 'archiveNo', dataIndex: 'archiveNo', width: 200, fixed: 'left' },
  { title: '归档标题', key: 'archiveTitle', dataIndex: 'archiveTitle', width: 220 },
  { title: '学年', key: 'academicYear', width: 100 },
  { title: '学期', key: 'semester', width: 88 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '五维状态', key: 'statusGroup', width: 320 },
  { title: '保管期限', key: 'retentionYears', width: 90 },
  { title: '到期日', key: 'archiveDueTime', width: 160 },
  { title: '操作', key: 'actions', width: 180 },
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
    : record.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
  if (!submittableStatus) return false
  if (record.canSubmitVolume !== true) return false
  return record.hasBlockingRemediationForSubmit === true
}

function shouldRemindVolume(record: ArchiveVolumeResponse) {
  // MVR-319：与 BE resolveCapabilities.canRemindArchiveDue / requireDepartmentReviewApprovalPermission 同源
  if (listTab.value !== 'college') {
    return false
  }
  // 禁止兼容回退全局 hasDuty；仅认 BE 列表行级能力位
  if (record.canRemindArchiveDue !== true) {
    return false
  }
  const remindable =
    record.volumeStatus === ArchiveVolumeStatusCode.COLLECTING ||
    record.volumeStatus === ArchiveVolumeStatusCode.DRAFT ||
    record.volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING ||
    record.volumeStatus === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
  if (!remindable) {
    return false
  }
  if (!record.archiveDueTime) {
    return false
  }
  return (
    isArchiveDueOverdue(record.archiveDueTime) ||
    isArchiveDueSoon(record.archiveDueTime, record.archiveDueReminderLeadDays)
  )
}

function buildVolumeActions(record: ArchiveVolumeResponse): UiTableRowActionItem[] {
  const submitBlocked = isSubmitBlockedByRemediation(record)
  const canSubmit = canSubmitVolumeRow(record)
  // 行内仅 1 个 primary：详情为主路径；阶段动作按显隐展示但无第二 primary
  return [
    { key: 'detail', label: '详情', tone: 'primary' },
    {
      key: 'appraisal',
      label: '鉴定',
      // MVR-329：仅认 BE 行级 canManageAppraisal===true；禁止 hasDutyForDepartment 回退
      hidden:
        record.appraisalStatus !== ArchiveAppraisalStatusCode.REMINDER_SENT ||
        record.canManageAppraisal !== true,
    },
    {
      key: 'remediation',
      label: '去整改',
      hidden: !showSubmitInMine.value || !hasOpenRemediationForVolume(record.volumeId),
    },
    {
      key: 'dept-review',
      label: '发起院系审核',
      hidden: !showSubmitInMine.value || record.canRequestDepartmentReview !== true,
      disabled: requestingDepartmentReviewVolumeId.value === record.volumeId,
    },
    {
      key: 'dept-audit',
      label: '院系审核',
      hidden:
        record.canApproveDepartmentReview !== true ||
        record.volumeStatus !== ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING,
    },
    {
      key: 'dept-withdraw',
      label: '撤回审核',
      hidden: !showSubmitInMine.value || record.canWithdrawDepartmentReview !== true,
    },
    {
      key: 'submit',
      label: '提交归档',
      hidden: !showSubmitInMine.value || (!canSubmit && !submitBlocked),
      disabled: submitBlocked,
    },
    {
      key: 'remind',
      label: '催办',
      hidden: !shouldRemindVolume(record),
      disabled: remindingVolumeId.value === record.volumeId,
    },
  ]
}

function handleVolumeAction(key: string, record: ArchiveVolumeResponse): void {
  switch (key) {
    case 'detail':
      goDetail(record.volumeId)
      break
    case 'appraisal':
      goAppraisal(record)
      break
    case 'remediation':
      goRemediationVolumeByVolumeId(record.volumeId)
      break
    case 'dept-review':
      void requestDepartmentReviewFromList(record)
      break
    case 'dept-audit':
      // MVR-379：与行级 canApproveDepartmentReview / 抽屉 canApprove 二次拦截
      if (record.canApproveDepartmentReview !== true) {
        void message.warning('当前账号不可进行院系审核')
        return
      }
      openDeptReviewDrawer(record.volumeId)
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
    showUserError(error, '课程列表加载失败')
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
    showUserError(error, '院系列表加载失败')
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
    const kpiSettled = await Promise.allSettled([
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
        collectingPhaseOnly: true,
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
    const kpiValues = kpiSettled.map((item) =>
      item.status === 'fulfilled' ? item.value.total : '—',
    )
    kpiTotalCount.value = kpiValues[0]
    kpiStoredCount.value = kpiValues[1]
    kpiSubmittedCount.value = kpiValues[2]
    kpiCollectingCount.value = kpiValues[3]
    kpiDueAppraisalCount.value = kpiValues[4]
    kpiPendingTransferCount.value = kpiValues[5]
    const anyKpiFailed = kpiSettled.some((item) => item.status === 'rejected')
    listOverviewKpisFailed.value = anyKpiFailed
    if (anyKpiFailed) {
      const firstError = kpiSettled.find((item) => item.status === 'rejected')
      showUserError(
        firstError && firstError.status === 'rejected' ? firstError.reason : null,
        '归档卷概览统计部分加载失败',
      )
    }
    if (canViewStatisticsKpi.value) {
      try {
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
      } catch (error) {
        kpiOverdueCount.value = '—'
        kpiMissingCount.value = '—'
        listOverviewKpisFailed.value = true
        showUserError(error, '归档卷逾期/缺件统计加载失败')
      }
    }
  } catch (error) {
    listOverviewKpisFailed.value = true
    kpiTotalCount.value = '—'
    kpiStoredCount.value = '—'
    kpiSubmittedCount.value = '—'
    kpiCollectingCount.value = '—'
    kpiDueAppraisalCount.value = '—'
    kpiPendingTransferCount.value = '—'
    showUserError(error, '归档卷概览统计加载失败')
  }
}

async function loadRemediationTabCount(): Promise<void> {
  try {
    const stats = await getOpenRemediationStats()
    remediationTabCount.value = stats.openTaskCount
    // MVR-339：Tab 显隐与创建能力改由 BE stats 下发
    canViewRemediationTabFromStats.value = stats.canViewRemediationTab === true
  } catch (error) {
    remediationTabCount.value = 0
    canViewRemediationTabFromStats.value = false
    showUserError(error, '待整改任务数加载失败')
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
    collectingPhaseOnly: filterExtras.collectingPhaseOnly || undefined,
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
    listLoadFailed.value = false
    if (showVolumeListPanel.value) {
      void loadListOverviewKpis()
      void loadS1AutoCreateAttention()
    }
  } catch (error) {
    showUserError(error, '加载课程考核袋列表失败')
    listLoadFailed.value = true
    selectedVolumeIds.value = []
  } finally {
    loading.value = false
  }
}

async function initPage() {
  await Promise.all([loadDepartments(), loadCourses()])
}

function handleScenarioSelect(key: ArchiveVolumeScenarioKey) {
  selectScenario(key)
  pagination.pageNum = 1
  selectedVolumeIds.value = []
  void loadVolumes()
}

function handleSearch() {
  if (filterForm.volumeStatus) {
    filterExtras.collectingPhaseOnly = false
  }
  if (!ensurePeriodFilterPair()) {
    return
  }
  pagination.pageNum = 1
  void loadVolumes()
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
  filterExtras.collectingPhaseOnly = false
  pagination.pageNum = 1
  selectedVolumeIds.value = []
  void loadVolumes()
}

function openBatchReject() {
  // MVR-333：与行级 canRejectTransfer 同源二次拦截
  if (!canRejectAnyOnPage.value) {
    void message.warning('当前账号无移交退回权限')
    return
  }
  // MVR-196/333：批量退回前剔除本人提交或无行级退回权的卷
  const selectableIds = selectedVolumeIds.value.filter((volumeId) => {
    const row = volumes.value.find((item) => item.volumeId === volumeId)
    return row != null && rowCanRejectTransfer(row) && !isTransferSubmitterSelf(row)
  })
  if (selectableIds.length === 0) {
    void message.warning('所选卷均不可退回（无权限或本人提交），请改选')
    return
  }
  if (selectableIds.length !== selectedVolumeIds.value.length) {
    void message.warning(
      `已排除 ${selectedVolumeIds.value.length - selectableIds.length} 条不可退回的卷`,
    )
    selectedVolumeIds.value = selectableIds
  }
  batchRejectReason.value = ''
  batchRejectOpen.value = true
}

async function submitBatchReject() {
  if (batchRejecting.value) return
  // MVR-333：与行级 canRejectTransfer 同源二次拦截
  if (!canRejectAnyOnPage.value) {
    void message.warning('当前账号无移交退回权限')
    return
  }
  // 提交前再过滤无行级权或本人提交的卷
  const selectableIds = selectedVolumeIds.value.filter((volumeId) => {
    const row = volumes.value.find((item) => item.volumeId === volumeId)
    return row != null && rowCanRejectTransfer(row) && !isTransferSubmitterSelf(row)
  })
  if (selectableIds.length === 0) {
    void message.warning('所选卷不可退回，请重新选择')
    return
  }
  selectedVolumeIds.value = selectableIds
  if (!batchRejectReason.value.trim()) {
    showFormValidationMessage('请填写退回原因')
    return
  }
  if (selectedVolumeIds.value.length === 0) {
    showFormValidationMessage('请选择课程考核袋')
    return
  }
  batchRejecting.value = true
  try {
    await batchRejectArchiveVolumeTransfer({
      volumeIds: selectedVolumeIds.value,
      rejectReason: batchRejectReason.value.trim(),
    })
    void message.success('批量退回完成')
    batchRejectOpen.value = false
    selectedVolumeIds.value = []
    await loadVolumes()
  } catch (error) {
    showUserError(error, '批量退回失败')
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

function goDetailWithTab(volumeId: string, tab?: string) {
  goDetail(volumeId, tab)
}

function openDeptReviewDrawer(volumeId: string) {
  // MVR-391：打开院系审核抽屉与行级 canApproveDepartmentReview 二次拦截
  const row = volumes.value.find((item) => item.volumeId === volumeId)
  if (row?.canApproveDepartmentReview !== true) {
    void message.warning('当前账号不可进行院系审核')
    return
  }
  deptReviewVolumeId.value = volumeId
  deptReviewDrawerOpen.value = true
}

async function handleDeptReviewDrawerCompleted() {
  await loadVolumes()
  void loadListOverviewKpis()
}

function goDetailWithSubmitIntent(volumeId: string) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: 'transfer', submitIntent: '1' },
  })
}

function goAppraisal(record: ArchiveVolumeResponse): void {
  // MVR-329：与 buildVolumeActions / BE canManageAppraisal 二次拦截
  if (record.canManageAppraisal !== true) {
    void message.warning('仅本卷所属院系档案管理员可进入鉴定')
    return
  }
  if (record.appraisalStatus !== ArchiveAppraisalStatusCode.REMINDER_SENT) {
    void message.warning('当前鉴定状态不可从列表进入鉴定')
    return
  }
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: record.volumeId },
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

async function requestDepartmentReviewFromList(record: ArchiveVolumeResponse) {
  if (requestingDepartmentReviewVolumeId.value) {
    return
  }
  // MVR-307：与行级 canRequestDepartmentReview 同源二次拦截
  if (record.canRequestDepartmentReview !== true) {
    void message.warning('当前账号无发起院系审核权限')
    return
  }
  const confirmed = await confirmAsync({
    title: '发起院系审核？',
    content: '发起后系统会停止在途归档扫描并冻结材料补录，审核退回或主动撤回后才能继续补件。',
    type: 'warning',
    okText: '发起审核',
  })
  if (!confirmed) return
  requestingDepartmentReviewVolumeId.value = record.volumeId
  try {
    await requestArchiveVolumeDepartmentReview({ volumeId: record.volumeId })
    void message.success('已发起院系审核')
    await loadVolumes()
  } catch (error) {
    showUserError(error, '发起院系审核失败')
    await goDetailForSubmitBlocker(record.volumeId)
  } finally {
    requestingDepartmentReviewVolumeId.value = null
  }
}

async function goDetailForSubmitBlocker(volumeId: string) {
  try {
    const preview = await previewArchiveVolumeSubmitChecklist(volumeId)
    const blocker = preview.blockingItems?.find((item) => !item.passed)
    if (blocker) {
      const routeTarget = resolveSubmitChecklistRoute(blocker)
      goDetailWithTab(volumeId, routeTarget.detailTabKey)
      return
    }
  } catch (error) {
    showUserError(error, '加载提交清单失败，已进入详情')
  }
  goDetail(volumeId)
}

async function withdrawDepartmentReviewFromList(record: ArchiveVolumeResponse) {
  if (withdrawingVolumeId.value) return
  // MVR-307：与行级 canWithdrawDepartmentReview 同源二次拦截
  if (record.canWithdrawDepartmentReview !== true) {
    void message.warning('当前账号无撤回院系审核权限')
    return
  }
  const confirmed = await confirmAsync({
    title: '撤回院系审核？',
    content: '撤回后归档卷回到材料收集状态，原审核通过结果失效；补件完成后需要重新发起院系审核。',
    type: 'warning',
    okText: '确认撤回',
  })
  if (!confirmed) return
  withdrawingVolumeId.value = record.volumeId
  try {
    await withdrawArchiveVolumeDepartmentReview({ volumeId: record.volumeId })
    void message.success('已撤回院系审核，可继续补件')
    await loadVolumes()
  } catch (error) {
    showUserError(error, '撤回院系审核失败')
  } finally {
    withdrawingVolumeId.value = null
  }
}

function remindVolume(record: ArchiveVolumeResponse) {
  // MVR-319：与 shouldRemindVolume / BE requireDepartmentReviewApprovalPermission 二次拦截
  if (!shouldRemindVolume(record)) {
    void message.warning('当前账号不可催办该归档卷')
    return
  }
  if (remindingVolumeId.value) {
    return
  }
  void (async () => {
    remindingVolumeId.value = record.volumeId
    try {
      await remindArchiveDue(record.volumeId)
      void message.success('催办通知已发送')
    } catch (error) {
      showUserError(error, '催办失败')
    } finally {
      remindingVolumeId.value = null
    }
  })()
}

async function loadOpenRemediationTasks() {
  if (listTab.value !== 'mine' || volumeScope.value !== 'mine') {
    openRemediationTasks.value = []
    openRemediationTaskTotal.value = 0
    remediationLoading.value = false
    return
  }
  remediationLoading.value = true
  try {
    const page = await pageOpenRemediationTasks({
      pageNum: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    })
    openRemediationTasks.value = page.list
    openRemediationTaskTotal.value = page.total
  } catch (error) {
    openRemediationTasks.value = []
    openRemediationTaskTotal.value = 0
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

function goSuspectedMixedScan() {
  void router.push({ name: 'TeacherArchiveVolumeSuspectedMixedScan' })
}

const listMoreActionItems = computed(() => {
  const items: Array<{ key: string; label: string }> = []
  if (canViewStatisticsKpi.value || canViewDestructionLedger.value) {
    items.push({ key: 'statistics', label: '统计与清册' })
  }
  if (canViewGlobalAudit.value) {
    items.push({ key: 'audit', label: '审计查询' })
  }
  if (canViewArchiveDepartmentQueue.value) {
    items.push({ key: 'mixed-scan', label: suspectedMixedScanButtonLabel.value })
  }
  return items
})

function onListMoreAction(key: string): void {
  if (key === 'statistics') {
    goStatistics()
    return
  }
  if (key === 'audit') {
    goAudit()
    return
  }
  if (key === 'mixed-scan') {
    goSuspectedMixedScan()
  }
}

function goCreateArchiveTask() {
  void router.push({
    name: 'TeacherCreateArchiveTask',
    query: { provenance: 'CURRENT_TERM_OFFLINE' },
  })
}

function goCreateHistorySupplement() {
  void router.push({
    name: 'TeacherCreateArchiveTask',
    query: { provenance: 'HISTORICAL_DIGITIZE' },
  })
}

function clearArchiveListStatusFilters() {
  archiveListQuickFilter.value = null
  filterForm.volumeStatus = undefined
  filterForm.integrityStatus = undefined
  filterForm.transferStatus = undefined
  filterForm.appraisalStatus = undefined
  filterExtras.integrityFailedOnly = false
  filterExtras.archiveOverdueOnly = false
  filterExtras.collectingPhaseOnly = false
}

function reloadArchiveListAfterSignalFilter() {
  if (showVolumeListPanel.value) {
    void loadVolumes()
  }
}

function handleSignalMetricClick(key: string) {
  if (key === 's1AutoCreate') {
    if (s1AttentionLoadFailed.value) {
      void loadS1AutoCreateAttention()
      return
    }
    if (s1AttentionExamCount.value <= 0) {
      return
    }
    goS1PrimaryAction()
    return
  }

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
    filterExtras.collectingPhaseOnly = false
    filterForm.volumeStatus = ArchiveVolumeStatusCode.STORED
    handleSearch()
    return
  }
  if (key === 'submitted') {
    archiveListQuickFilter.value = null
    filterExtras.integrityFailedOnly = false
    filterExtras.collectingPhaseOnly = false
    filterForm.volumeStatus = ArchiveVolumeStatusCode.SUBMITTED
    handleSearch()
    return
  }
  if (key === 'collecting') {
    archiveListQuickFilter.value = null
    filterExtras.integrityFailedOnly = false
    filterForm.volumeStatus = undefined
    filterExtras.collectingPhaseOnly = true
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
    openRemediationTaskTotal.value = 0
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
  void loadArchiveSetupReadiness()
  // loadSuspectedMixedPendingTotal 内会 loadGrants，避免与 initPage 并行重复弹错
  void loadSuspectedMixedPendingTotal()
  applyRouteQuery()
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    await loadOpenRemediationTasks()
  }
  if (showVolumeListPanel.value) {
    await loadVolumes()
    await Promise.all([loadListOverviewKpis(), loadS1AutoCreateAttention()])
    await loadRemediationTabCount()
  } else {
    void loadS1AutoCreateAttention()
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

.archive-volume-list__quick-filter {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-volume-list__scope-bar {
  display: flex;
  align-items: center;
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

:deep(.archive-volume-list__table) {
  .ant-table-tbody > tr.archive-volume-list__row--error > td {
    background: color-mix(in srgb, var(--dp-color-error) 7%, transparent);
  }

  .ant-table-tbody > tr.archive-volume-list__row--warning > td {
    background: color-mix(in srgb, var(--dp-color-warning) 8%, transparent);
  }

  .ant-table-tbody > tr.archive-volume-list__row--info > td {
    background: color-mix(in srgb, var(--dp-blue-400) 8%, transparent);
  }
}
</style>
