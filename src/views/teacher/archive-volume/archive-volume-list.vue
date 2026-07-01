<template>
  <StageWorkbenchShell>
    <template #context>
      <UiFilterBar
        v-if="listTab === 'mine'"
        v-model="filterModel"
        :fields="filterFields"
        variant="panel"
        show-labels
        search-text="查询"
        actions-align="end"
        class="archive-volume-list__filter archive-volume-list__filter--context"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #actions>
          <UiButton v-if="canViewStatisticsKpi" variant="outline" size="sm" @click="goAudit">
            审计查询
          </UiButton>
          <UiButton
            v-if="hasDuty('COLLEGE_COORDINATOR')"
            variant="outline"
            size="sm"
            @click="importDrawerOpen = true"
          >
            批量导入
          </UiButton>
          <UiButton size="sm" variant="outline" @click="goCreateOffline"> 新建 </UiButton>
          <UiButton size="sm" @click="handleSearch"> 查询 </UiButton>
          <UiButton size="sm" variant="outline" @click="handleReset"> 重置 </UiButton>
        </template>
      </UiFilterBar>
      <ContextBar v-else show-title title="课程考核归档卷">
        <template #actions>
          <UiButton
            v-if="canViewStatisticsKpi && (listTab === 'college' || listTab === 'archive')"
            variant="outline"
            size="sm"
            @click="goStatistics"
          >
            迎评统计
          </UiButton>
          <UiButton v-if="canViewStatisticsKpi" variant="outline" size="sm" @click="goAudit">
            审计查询
          </UiButton>
          <UiButton
            v-if="hasDuty('COLLEGE_COORDINATOR')"
            variant="outline"
            size="sm"
            @click="importDrawerOpen = true"
          >
            批量导入
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="showSignalBand" #signal>
      <SignalBand :metrics="activeSignalMetrics" compact @metric-click="handleSignalMetricClick" />
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

      <ArchiveVolumeSupervisionPanel v-if="listTab === 'supervision'" />

      <ArchiveVolumeRemediationPanel v-else-if="listTab === 'remediation'" />

      <section v-else-if="showVolumeListPanel" class="archive-volume-list__panel">
        <UiSectionTabs
          v-if="listTab === 'archive'"
          v-model="archiveSubTab"
          :items="archiveSubTabs"
          compact
          class="archive-volume-list__sub-tabs"
        />

        <UiBatchActionBar
          v-if="listTab === 'college' && canRejectTransfer && selectedVolumeIds.length > 0"
          :selected-count="selectedVolumeIds.length"
          class="archive-volume-list__batch"
        >
          <UiButton size="sm" variant="outline" @click="openBatchReject">批量退回</UiButton>
        </UiBatchActionBar>

        <div
          v-if="showVolumeFilter && listTab !== 'mine' && archiveSubTab !== 'pending-access'"
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
          >
            <template #actions>
              <UiButton size="sm" @click="handleSearch"> 查询 </UiButton>
              <UiButton size="sm" variant="outline" @click="handleReset"> 重置 </UiButton>
            </template>
          </UiFilterBar>
        </div>

        <div v-if="listTab === 'mine'" class="archive-volume-list__scope-bar">
          <a-segmented
            :value="volumeScope"
            :options="volumeScopeOptions"
            @change="handleVolumeScopeChange"
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

        <UiDataTable
          v-if="archiveSubTab !== 'pending-access'"
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :columns="tableColumns"
          :data-source="volumes"
          :loading="loading"
          :total="pagination.total"
          :row-selection="rowSelection"
          flat
          row-key="volumeId"
          size="middle"
          class="student-detail-table__data-table"
          :empty-description="emptyDescription"
          @page-change="loadVolumes"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archiveNo'">
              <button type="button" class="link-cell" @click="goDetail(record.volumeId)">
                {{ record.archiveNo }}
              </button>
              <div class="link-cell__sub">{{ record.archiveTitle }}</div>
            </template>
            <template v-else-if="column.key === 'course'">
              <span>{{ record.teachingClassName || '—' }}</span>
              <div v-if="record.departmentName" class="link-cell__sub">
                {{ record.departmentName }}
              </div>
            </template>
            <template v-else-if="column.key === 'sourceType'">
              <UiTag :tone="sourceTypeTone(record.sourceType)" size="sm">
                {{ sourceTypeLabel(record.sourceType) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'statusGroup'">
              <div class="status-tags">
                <UiTag :tone="volumeStatusTone(record.volumeStatus)" size="sm">
                  {{ volumeStatusLabel(record.volumeStatus) }}
                </UiTag>
                <UiTag :tone="integrityStatusTone(record.integrityStatus)" size="sm">
                  {{ integrityStatusLabel(record.integrityStatus) }}
                </UiTag>
                <UiTag :tone="transferStatusTone(record.transferStatus)" size="sm">
                  {{ transferStatusLabel(record.transferStatus) }}
                </UiTag>
                <UiTag
                  v-if="record.appraisalStatus"
                  :tone="appraisalStatusTone(record.appraisalStatus)"
                  size="sm"
                >
                  {{ appraisalStatusLabel(record.appraisalStatus) }}
                </UiTag>
                <UiTag v-if="record.hasOpenRemediationTask" tone="orange" size="sm"> 待整改 </UiTag>
              </div>
            </template>
            <template v-else-if="column.key === 'archiveDueTime'">
              {{ formatDateTime(record.archiveDueTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <UiTextAction tone="primary" @click="goDetail(record.volumeId)">详情</UiTextAction>
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

        <UiDataTable
          v-if="archiveSubTab === 'pending-access'"
          pagination-mode="none"
          :columns="pendingAccessColumns"
          :data-source="pendingAccessRecords"
          :loading="pendingAccessLoading"
          :show-pagination="false"
          flat
          row-key="accessRecordId"
          size="middle"
          empty-description="暂无待审批查阅申请"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'archiveNo'">
              <button type="button" class="link-cell" @click="goDetail(record.volumeId)">
                {{ record.archiveNo || '—' }}
              </button>
              <div v-if="record.archiveTitle" class="link-cell__sub">{{ record.archiveTitle }}</div>
            </template>
            <template v-else-if="column.key === 'applicant'">
              <span>{{ record.applicantNickName }}</span>
            </template>
            <template v-else-if="column.key === 'accessStatus'">
              <UiTag :tone="accessStatusTone(record.accessStatus)" size="sm">
                {{ accessStatusLabel(record.accessStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction
                v-if="
                  canApproveAccessForVolume({
                    departmentId: record.departmentId,
                    securityLevel: record.securityLevel,
                  })
                "
                tone="primary"
                @click="goDetail(record.volumeId)"
              >
                审批
              </UiTextAction>
              <span v-else class="link-cell__sub">仅可查看</span>
            </template>
          </template>
        </UiDataTable>
      </section>
    </div>

    <a-modal
      v-model:open="batchRejectOpen"
      title="批量退回"
      :confirm-loading="batchRejecting"
      ok-text="确认退回"
      cancel-text="取消"
      @ok="submitBatchReject"
    >
      <a-form layout="vertical">
        <a-form-item label="退回原因" required>
          <a-textarea v-model:value="batchRejectReason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <UiDrawer
      v-model:open="reviewerDrawerOpen"
      title="档案验收"
      width="480"
      @close="closeReviewerDrawer"
    >
      <a-spin :spinning="reviewerDrawerLoading">
        <template v-if="reviewerDetail">
          <p class="archive-volume-list__drawer-title">{{ reviewerDetail.volume.archiveTitle }}</p>
          <p class="archive-volume-list__drawer-meta">{{ reviewerDetail.volume.archiveNo }}</p>
          <div class="status-tags archive-volume-list__drawer-tags">
            <UiTag :tone="volumeStatusTone(reviewerDetail.volume.volumeStatus)" size="sm">
              {{ volumeStatusLabel(reviewerDetail.volume.volumeStatus) }}
            </UiTag>
            <UiTag :tone="integrityStatusTone(reviewerDetail.volume.integrityStatus)" size="sm">
              {{ integrityStatusLabel(reviewerDetail.volume.integrityStatus) }}
            </UiTag>
            <UiTag :tone="transferStatusTone(reviewerDetail.volume.transferStatus)" size="sm">
              {{ transferStatusLabel(reviewerDetail.volume.transferStatus) }}
            </UiTag>
          </div>
          <p v-if="reviewerDetail.latestFourPropertyCheck" class="archive-volume-list__drawer-line">
            四性检测：{{ reviewerDetail.latestFourPropertyCheck.overallPassed ? '通过' : '未通过' }}
          </p>
          <div class="archive-volume-list__drawer-actions">
            <UiButton
              v-if="canReviewTransfer && reviewerDetail.volume.transferStatus === 'PENDING_REVIEW'"
              size="sm"
              :loading="reviewerApproving"
              @click="approveTransferInDrawer"
            >
              验收通过
            </UiButton>
            <UiButton
              v-if="reviewerDetail.latestTransferRecord?.transferPackageFileId"
              size="sm"
              variant="outline"
              @click="downloadReviewerTransferPackage"
            >
              下载移交包
            </UiButton>
            <UiButton size="sm" variant="outline" @click="openReviewerFullDetail">
              打开完整详情
            </UiButton>
          </div>
        </template>
      </a-spin>
    </UiDrawer>

    <UiDrawer v-model:open="importDrawerOpen" title="外部批量导入" width="560">
      <ArchiveVolumeExternalImportPanel />
      <ArchiveVolumeHistoryImportPanel class="archive-volume-list__history-import" />
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType, TableProps } from 'ant-design-vue/es/table'
import type { LocationQueryRaw } from 'vue-router'
import type {
  ArchiveAccessStatusCode,
  ArchiveAppraisalStatusCode,
  ArchiveIntegrityStatusCode,
  ArchiveRemediationTaskVO,
  ArchiveTransferStatusCode,
  ArchiveVolumeAccessRecordVO,
  ArchiveVolumeDetailVO,
  ArchiveVolumePageRequest,
  ArchiveVolumeSourceTypeCode,
  ArchiveVolumeStatusCode,
  ArchiveVolumeVO,
} from '@/apis/mark/archive-volume'
import type { TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { ArchiveVolumeScenarioKey } from '@/composables/useArchiveVolumeFilterPresets'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  approveArchiveVolumeTransfer,
  ARCHIVE_ACCESS_STATUS_LABEL,
  ARCHIVE_ACCESS_STATUS_TONE,
  ARCHIVE_APPRAISAL_STATUS_LABEL,
  ARCHIVE_APPRAISAL_STATUS_TONE,
  ARCHIVE_INTEGRITY_STATUS_LABEL,
  ARCHIVE_INTEGRITY_STATUS_TONE,
  ARCHIVE_TRANSFER_STATUS_LABEL,
  ARCHIVE_TRANSFER_STATUS_TONE,
  ARCHIVE_VOLUME_SOURCE_TYPE_LABEL,
  ARCHIVE_VOLUME_SOURCE_TYPE_TONE,
  ARCHIVE_VOLUME_STATUS_LABEL,
  ARCHIVE_VOLUME_STATUS_TONE,
  batchRejectArchiveVolumeTransfer,
  getArchiveVolumeDetail,
  getArchiveVolumeStatistics,
  listOpenRemediationTasks,
  listPendingArchiveAccessRecords,
  pageArchiveVolumes,
  pageOverdueArchiveVolumes,
  remindArchiveDue,
} from '@/apis/mark/archive-volume'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import { requireArrayResult } from '@/components/quality/selectors/page-contract'
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
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeExternalImportPanel from '@/views/teacher/archive-volume/archive-volume-external-import-panel.vue'
import ArchiveVolumeHistoryImportPanel from '@/views/teacher/archive-volume/archive-volume-history-import-panel.vue'
import ArchiveVolumeRemediationPanel from '@/views/teacher/archive-volume/archive-volume-remediation-panel.vue'
import ArchiveVolumeSupervisionPanel from '@/views/teacher/archive-volume/archive-volume-supervision-panel.vue'
import ArchiveSetupGuideBanner from '@/views/teacher/archive-volume/components/ArchiveSetupGuideBanner.vue'
import ArchiveVolumeMineRemediationBanner from '@/views/teacher/archive-volume/components/ArchiveVolumeMineRemediationBanner.vue'

defineOptions({ name: 'TeacherArchiveVolumeList' })

type ListTabKey = 'mine' | 'college' | 'archive' | 'supervision' | 'remediation'
type ArchiveSubTabKey = 'pending-transfer' | 'pending-access' | 'due-appraisal' | 'overdue'
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
  canApproveAccessForVolume,
  canRejectTransfer,
  canReviewTransfer,
  canViewStatisticsKpi,
  hasDuty,
  loadGrants,
  scopedDepartmentIds,
  listScopedDepartmentIds,
  filterListDepartmentOptions,
} = useArchiveDutyAccess()

const currentUserId = computed(() => userStore.userInfo?.userId ?? '')

const listTab = ref<ListTabKey>('mine')
const volumeScope = ref<VolumeScopeKey>('all')
const archiveSubTab = ref<ArchiveSubTabKey>('pending-transfer')
const loading = ref(false)
const pendingAccessLoading = ref(false)
const batchRejecting = ref(false)
const batchRejectOpen = ref(false)
const importDrawerOpen = ref(false)
const batchRejectReason = ref('')
const reviewerDrawerOpen = ref(false)
const reviewerDrawerLoading = ref(false)
const reviewerApproving = ref(false)
const reviewerDetail = ref<ArchiveVolumeDetailVO | null>(null)
const reviewerVolumeId = ref('')
const volumes = ref<ArchiveVolumeVO[]>([])
const openRemediationTasks = ref<ArchiveRemediationTaskVO[]>([])
const remediationLoading = ref(false)
const openRemediationVolumeIdSet = computed(
  () => new Set(openRemediationTasks.value.map((task) => task.volumeId)),
)
const pendingAccessRecords = ref<ArchiveVolumeAccessRecordVO[]>([])
const selectedVolumeIds = ref<string[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })
const allDepartmentOptions = ref<Array<{ value: string, label: string }>>([])
const kpiCollectingCount = ref<number | string>('—')
const kpiPendingTransferCount = ref<number | string>('—')
const kpiMissingCount = ref<number | string>('—')
const kpiOverdueCount = ref<number | string>('—')
const mineSummaryCollectingCount = ref<number | string>('—')
const mineSummaryMissingCount = ref<number | string>('—')
const mineSummaryOverdueCount = ref<number | string>('—')
const mineSummaryCountsFailed = ref(false)
const filterExtras = reactive({
  integrityFailedOnly: false,
  archiveOverdueOnly: false,
})
const defaultYearSemester = getDefaultAcademicYearAndSemester()
const filterForm = reactive({
  keyword: '',
  departmentId: undefined as string | undefined,
  academicYear: defaultYearSemester.academicYear as string | undefined,
  semester: defaultYearSemester.semester as SemesterCode | undefined,
  sourceType: undefined as ArchiveVolumeSourceTypeCode | undefined,
  volumeStatus: undefined as ArchiveVolumeStatusCode | undefined,
  integrityStatus: undefined as ArchiveIntegrityStatusCode | undefined,
  transferStatus: undefined as ArchiveTransferStatusCode | undefined,
  appraisalStatus: undefined as ArchiveAppraisalStatusCode | undefined,
})
const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const visibleListTabs = computed(() => {
  const tabs: Array<{ key: ListTabKey, label: string }> = [{ key: 'mine', label: '归档卷' }]
  if (canViewCollegeBoard.value) {
    tabs.push({ key: 'college', label: '院系看板' })
  }
  if (canViewArchiveReviewer.value) {
    tabs.push({ key: 'archive', label: '档案验收' })
  }
  if (canViewSupervision.value) {
    tabs.push({ key: 'supervision', label: '督导抽查' })
  }
  if (canViewCollegeBoard.value || canViewSupervision.value || hasDuty('ARCHIVE_ADMIN')) {
    tabs.push({ key: 'remediation', label: '迎评整改' })
  }
  return tabs
})

const volumeScopeOptions = [
  { label: '全部', value: 'all' },
  { label: '我的', value: 'mine' },
]

function handleVolumeScopeChange(value: string | number) {
  if (value !== 'all' && value !== 'mine') {
    return
  }
  volumeScope.value = value
}

const showRoleTabs = computed(() => visibleListTabs.value.length > 1)

const showVolumeListPanel = computed(
  () => listTab.value === 'mine' || listTab.value === 'college' || listTab.value === 'archive',
)

const archiveSubTabs = computed(() => {
  const tabs: Array<{ key: ArchiveSubTabKey, label: string }> = [
    { key: 'pending-transfer', label: '待验收移交' },
  ]
  if (hasDuty('ARCHIVE_ADMIN') || hasDuty('TRANSFER_REVIEWER')) {
    tabs.push({ key: 'pending-access', label: '待审批查阅' })
  }
  tabs.push({ key: 'due-appraisal', label: '到期鉴定' })
  if (canViewCollegeBoard.value || canViewArchiveReviewer.value) {
    tabs.push({ key: 'overdue', label: '逾期卷' })
  }
  return tabs
})

const emptyDescription = computed(() => {
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    return '尚无我的归档卷，线上考试关考后将自动创建'
  }
  if (listTab.value === 'mine' && volumeScope.value === 'all') {
    return '当前筛选无归档卷'
  }
  if (listTab.value === 'archive' && archiveSubTab.value === 'pending-transfer') {
    return '暂无待验收归档卷'
  }
  if (listTab.value === 'archive' && archiveSubTab.value === 'due-appraisal') {
    return '暂无到期鉴定归档卷'
  }
  if (listTab.value === 'archive' && archiveSubTab.value === 'overdue') {
    return '暂无逾期归档卷'
  }
  return '当前筛选无结果'
})

const showSignalBand = computed(() => {
  if (listTab.value === 'mine') {
    return true
  }
  return canViewStatisticsKpi.value && (listTab.value === 'college' || listTab.value === 'archive')
})

const signalMetrics = computed<SignalMetric[]>(() => [
  { key: 'collecting', label: '待提交', value: kpiCollectingCount.value },
  { key: 'pending', label: '待验收', value: kpiPendingTransferCount.value },
  { key: 'missing', label: '缺项', value: kpiMissingCount.value },
  {
    key: 'overdue',
    label: '逾期',
    value: kpiOverdueCount.value,
    tone: 'red',
    clickable: canViewCollegeBoard.value || canViewArchiveReviewer.value,
  },
])

const mineSummarySignalMetrics = computed((): SignalMetric[] => {
  const dash = '—'
  const filteredTotal = pagination.total ?? 0
  const collectingValue = mineSummaryCountsFailed.value ? dash : mineSummaryCollectingCount.value
  const missingValue = mineSummaryCountsFailed.value ? dash : mineSummaryMissingCount.value
  const overdueValue = mineSummaryCountsFailed.value ? dash : mineSummaryOverdueCount.value
  const remediationCount = openRemediationTasks.value.length
  const isMineScope = volumeScope.value === 'mine'

  return [
    {
      key: 'filtered',
      label: '筛选命中',
      value: filteredTotal,
      unit: '卷',
      tone: 'blue',
      helper: isMineScope ? '我的归档卷范围' : '当前列表范围',
    },
    {
      key: 'collecting',
      label: '待提交',
      value: collectingValue,
      unit: '卷',
      tone: 'green',
      clickable: !mineSummaryCountsFailed.value && Number(collectingValue) > 0,
      helper: '收集中卷，点击筛选待提交',
    },
    {
      key: 'missing',
      label: '缺项',
      value: missingValue,
      unit: '卷',
      tone: !mineSummaryCountsFailed.value && Number(missingValue) > 0 ? 'orange' : 'gray',
      clickable: !mineSummaryCountsFailed.value && Number(missingValue) > 0,
      helper: '完整性未通过，点击筛选缺项卷',
    },
    isMineScope
      ? {
          key: 'remediation',
          label: '待整改',
          value: remediationCount,
          unit: '卷',
          tone: remediationCount > 0 ? 'orange' : 'gray',
          clickable: remediationCount > 0,
          helper: remediationCount > 0 ? '开放整改任务，点击查看' : '暂无待整改',
        }
      : {
          key: 'overdue',
          label: '已逾期',
          value: overdueValue,
          unit: '卷',
          tone: !mineSummaryCountsFailed.value && Number(overdueValue) > 0 ? 'red' : 'gray',
          clickable: !mineSummaryCountsFailed.value && Number(overdueValue) > 0,
          helper:
            !mineSummaryCountsFailed.value && Number(overdueValue) > 0
              ? '归档时限已过，点击筛选'
              : '暂无逾期卷',
        },
  ]
})

const activeSignalMetrics = computed(() =>
  listTab.value === 'mine' ? mineSummarySignalMetrics.value : signalMetrics.value,
)

const appraisalFilterDisabled = computed(
  () => listTab.value === 'archive' && archiveSubTab.value === 'due-appraisal',
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

const sourceTypeOptions = Object.entries(ARCHIVE_VOLUME_SOURCE_TYPE_LABEL).map(
  ([value, label]) => ({
    value,
    label,
  }),
)

const volumeStatusOptions = Object.entries(ARCHIVE_VOLUME_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const integrityStatusOptions = Object.entries(ARCHIVE_INTEGRITY_STATUS_LABEL).map(
  ([value, label]) => ({
    value,
    label,
  }),
)

const transferStatusOptions = Object.entries(ARCHIVE_TRANSFER_STATUS_LABEL).map(
  ([value, label]) => ({
    value,
    label,
  }),
)

const appraisalStatusOptions = Object.entries(ARCHIVE_APPRAISAL_STATUS_LABEL).map(
  ([value, label]) => ({
    value,
    label,
  }),
)

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
    options: sourceTypeOptions,
    allowClear: true,
  },
  {
    key: 'volumeStatus',
    label: '卷状态',
    type: 'select',
    options: volumeStatusOptions,
    allowClear: true,
  },
  {
    key: 'integrityStatus',
    label: '完整性',
    type: 'select',
    options: integrityStatusOptions,
    allowClear: true,
  },
  {
    key: 'transferStatus',
    label: '移交状态',
    type: 'select',
    options: transferStatusOptions,
    allowClear: true,
  },
  {
    key: 'appraisalStatus',
    label: '鉴定状态',
    type: 'select',
    options: appraisalStatusOptions,
    allowClear: true,
    disabled: appraisalFilterDisabled.value,
    placeholder: appraisalFilterDisabled.value ? '到期鉴定 Tab 已固定筛选' : undefined,
  },
])

const tableColumns = computed<ColumnsType<ArchiveVolumeVO>>(() => [
  { title: '档案号', key: 'archiveNo', dataIndex: 'archiveNo', width: 220 },
  { title: '班级 / 院系', key: 'course', width: 180 },
  { title: '来源', key: 'sourceType', width: 120 },
  { title: '状态', key: 'statusGroup', width: 320 },
  { title: '归档截止', key: 'archiveDueTime', width: 160 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
])

const pendingAccessColumns: ColumnsType<ArchiveVolumeAccessRecordVO> = [
  { title: '档案号', key: 'archiveNo', width: 180 },
  { title: '申请人', key: 'applicant', width: 140 },
  { title: '状态', key: 'accessStatus', width: 100 },
  { title: '查阅原因', dataIndex: 'accessReason', key: 'accessReason' },
  { title: '操作', key: 'actions', width: 100 },
]

function sourceTypeTone(code: ArchiveVolumeSourceTypeCode): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_SOURCE_TYPE_TONE, code, 'sourceType')
}

function volumeStatusLabel(code: ArchiveVolumeStatusCode) {
  return strictEnumLabel(ARCHIVE_VOLUME_STATUS_LABEL, code, 'volumeStatus')
}

function volumeStatusTone(code: ArchiveVolumeStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_VOLUME_STATUS_TONE, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveIntegrityStatusCode) {
  return strictEnumLabel(ARCHIVE_INTEGRITY_STATUS_LABEL, code, 'integrityStatus')
}

function integrityStatusTone(code: ArchiveIntegrityStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_INTEGRITY_STATUS_TONE, code, 'integrityStatus')
}

function transferStatusLabel(code: ArchiveTransferStatusCode) {
  return strictEnumLabel(ARCHIVE_TRANSFER_STATUS_LABEL, code, 'transferStatus')
}

function transferStatusTone(code: ArchiveTransferStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_TRANSFER_STATUS_TONE, code, 'transferStatus')
}

function appraisalStatusLabel(code: ArchiveAppraisalStatusCode) {
  return strictEnumLabel(ARCHIVE_APPRAISAL_STATUS_LABEL, code, 'appraisalStatus')
}

function appraisalStatusTone(code: ArchiveAppraisalStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_APPRAISAL_STATUS_TONE, code, 'appraisalStatus')
}

function sourceTypeLabel(code: ArchiveVolumeSourceTypeCode) {
  return strictEnumLabel(ARCHIVE_VOLUME_SOURCE_TYPE_LABEL, code, 'sourceType')
}

function accessStatusTone(code: ArchiveAccessStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_ACCESS_STATUS_TONE, code, 'accessStatus')
}

function accessStatusLabel(code: ArchiveAccessStatusCode) {
  return strictEnumLabel(ARCHIVE_ACCESS_STATUS_LABEL, code, 'accessStatus')
}

function canSubmitVolumeRow(record: ArchiveVolumeVO) {
  return canSubmitArchiveVolumeRow(record, currentUserId.value)
}

function isSubmitBlockedByRemediation(record: ArchiveVolumeVO) {
  if (listTab.value !== 'mine' || volumeScope.value !== 'mine') return false
  if (record.volumeStatus !== 'COLLECTING') return false
  if (record.responsibleUserId !== currentUserId.value) return false
  return record.hasBlockingRemediationForSubmit === true
}

function shouldRemindVolume(record: ArchiveVolumeVO) {
  if (listTab.value !== 'college') return false
  if (record.volumeStatus !== 'COLLECTING') return false
  if (!record.archiveDueTime) return false
  return new Date(record.archiveDueTime).getTime() < Date.now()
}

async function loadDepartments() {
  try {
    const departments = requireArrayResult<TenantSchoolDepartmentDto>(
      await departmentCatalogApi.list(),
      '院系',
    )
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

async function loadSignalKpis() {
  if (!showSignalBand.value) return
  if (listTab.value === 'mine') return
  try {
    const statsRequest: { departmentId?: string } = {}
    const scopeIds
      = listTab.value === 'college' ? scopedDepartmentIds.value : listScopedDepartmentIds.value
    if (scopeIds.length === 1) {
      statsRequest.departmentId = scopeIds[0]
    }
    const stats = await getArchiveVolumeStatistics(statsRequest)
    kpiOverdueCount.value = stats.overdueVolumeCount
    kpiMissingCount.value = stats.missingMaterials.reduce(
      (sum, item) => sum + item.missingVolumeCount,
      0,
    )
    const pageBase: { departmentId?: string } = {}
    if (statsRequest.departmentId) {
      pageBase.departmentId = statsRequest.departmentId
    }
    const [collectingResult, pendingResult] = await Promise.all([
      pageArchiveVolumes({ ...pageBase, volumeStatus: 'COLLECTING', pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({
        ...pageBase,
        transferStatus: 'PENDING_REVIEW',
        pageNum: 1,
        pageSize: 1,
      }),
    ])
    kpiCollectingCount.value = readPageTotal(collectingResult)
    kpiPendingTransferCount.value = readPageTotal(pendingResult)
  } catch (error) {
    showUserError(error)
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
  const raw = route.query.sourceType
  if (typeof raw !== 'string') return
  if (!(raw in ARCHIVE_VOLUME_SOURCE_TYPE_LABEL)) return
  filterForm.sourceType = raw as ArchiveVolumeSourceTypeCode
  if (canViewArchiveReviewer.value) {
    listTab.value = 'archive'
  }
}

function resolveListTabFromQuery(): ListTabKey {
  const raw = route.query.tab
  const tab = typeof raw === 'string' ? raw : 'mine'
  const allowed = visibleListTabs.value.map((item) => item.key)
  if (allowed.includes(tab as ListTabKey)) {
    return tab as ListTabKey
  }
  return 'mine'
}

function resolvePeriodFilter(): Pick<ArchiveVolumePageRequest, 'academicYear' | 'semester'> {
  const academicYear = filterForm.academicYear?.trim()
  const semester = filterForm.semester
  if (!academicYear && !semester) {
    return {}
  }
  return {
    academicYear: academicYear || undefined,
    semester: semester || undefined,
  }
}

/** 归档卷列表共用筛选条件（不含分页与 Tab 特化字段）。 */
function buildVolumeFilterRequest(): ArchiveVolumePageRequest {
  const periodFilter = resolvePeriodFilter()
  const request: ArchiveVolumePageRequest = {
    keyword: filterForm.keyword.trim() || undefined,
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

async function loadMineSummaryKpis() {
  if (listTab.value !== 'mine') {
    return
  }
  mineSummaryCountsFailed.value = false
  try {
    const countBase = buildVolumeFilterRequest()
    delete countBase.integrityFailedOnly
    delete countBase.archiveOverdueOnly
    const [collectingResult, missingResult, overdueResult] = await Promise.all([
      pageArchiveVolumes({ ...countBase, volumeStatus: 'COLLECTING', pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({ ...countBase, integrityFailedOnly: true, pageNum: 1, pageSize: 1 }),
      pageArchiveVolumes({ ...countBase, archiveOverdueOnly: true, pageNum: 1, pageSize: 1 }),
    ])
    mineSummaryCollectingCount.value = readPageTotal(collectingResult)
    mineSummaryMissingCount.value = readPageTotal(missingResult)
    mineSummaryOverdueCount.value = readPageTotal(overdueResult)
  } catch {
    mineSummaryCountsFailed.value = true
    mineSummaryCollectingCount.value = '—'
    mineSummaryMissingCount.value = '—'
    mineSummaryOverdueCount.value = '—'
  }
}

async function loadVolumes() {
  if (setupBlocking.value) {
    volumes.value = []
    pagination.total = 0
    return
  }
  if (!showVolumeFilter.value) return
  if (grantsLoadFailed.value) return
  if (listTab.value === 'archive' && archiveSubTab.value === 'pending-access') {
    await loadPendingAccess()
    return
  }
  loading.value = true
  try {
    const isOverdueTab = archiveSubTab.value === 'overdue' && listTab.value === 'archive'
    const periodFilter = resolvePeriodFilter()
    const request: ArchiveVolumePageRequest = isOverdueTab
      ? {
          keyword: filterForm.keyword.trim() || undefined,
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
    if (!isOverdueTab && listTab.value === 'archive') {
      if (archiveSubTab.value === 'pending-transfer') {
        request.transferStatus = 'PENDING_REVIEW'
      }
      if (archiveSubTab.value === 'due-appraisal') {
        Object.assign(request, { dueAppraisalOnly: true })
      } else if (filterForm.appraisalStatus) {
        request.appraisalStatus = filterForm.appraisalStatus
      }
    } else if (!isOverdueTab && filterForm.appraisalStatus) {
      request.appraisalStatus = filterForm.appraisalStatus
    }
    if (listTab.value === 'mine' && volumeScope.value === 'mine') {
      request.mineOnly = true
    }
    const result = isOverdueTab
      ? await pageOverdueArchiveVolumes(request)
      : await pageArchiveVolumes(request)
    volumes.value = filterScenarioRows(readPageList(result, '归档卷列表异常，请刷新后重试'))
    pagination.total = readPageTotal(result)
    if (listTab.value === 'mine') {
      void loadMineSummaryKpis()
    } else if (showSignalBand.value) {
      void loadSignalKpis()
    }
  } catch (error) {
    showUserError(error, '加载归档卷列表失败')
    volumes.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

async function loadPendingAccess() {
  pendingAccessLoading.value = true
  try {
    pendingAccessRecords.value = await listPendingArchiveAccessRecords()
  } catch (error) {
    showUserError(error, '加载待审批查阅失败')
    pendingAccessRecords.value = []
  } finally {
    pendingAccessLoading.value = false
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
  pagination.pageNum = 1
  void loadVolumes()
}

function handleReset() {
  clearScenario()
  filterForm.keyword = ''
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
  if (listTab.value === 'archive' && archiveSubTab.value === 'pending-transfer') {
    void openReviewerDrawer(volumeId)
    return
  }
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: archiveSubTab.value === 'pending-access' ? { tab: 'access' } : undefined,
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

function goRemediationVolume(task: ArchiveRemediationTaskVO) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: task.volumeId },
    query: { tab: 'materials', remediationTaskId: task.taskId },
  })
}

function goRemediationVolumeByVolumeId(volumeId: string) {
  const task = openRemediationTasks.value.find((item) => item.volumeId === volumeId)
  if (task) {
    goRemediationVolume(task)
    return
  }
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: 'materials' },
  })
}

async function openReviewerDrawer(volumeId: string) {
  reviewerVolumeId.value = volumeId
  reviewerDrawerOpen.value = true
  reviewerDrawerLoading.value = true
  try {
    reviewerDetail.value = await getArchiveVolumeDetail(volumeId)
  } catch (error) {
    showUserError(error)
    reviewerDetail.value = null
    reviewerDrawerOpen.value = false
  } finally {
    reviewerDrawerLoading.value = false
  }
}

function closeReviewerDrawer() {
  reviewerDetail.value = null
  reviewerVolumeId.value = ''
}

function openReviewerFullDetail() {
  if (!reviewerVolumeId.value) return
  reviewerDrawerOpen.value = false
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId: reviewerVolumeId.value },
    query: { tab: 'transfer' },
  })
}

async function approveTransferInDrawer() {
  if (!reviewerVolumeId.value) return
  reviewerApproving.value = true
  try {
    await approveArchiveVolumeTransfer({ volumeId: reviewerVolumeId.value })
    message.success('移交验收通过')
    reviewerDrawerOpen.value = false
    await loadVolumes()
  } catch (error) {
    showUserError(error)
  } finally {
    reviewerApproving.value = false
  }
}

function remindVolume(record: ArchiveVolumeVO) {
  void (async () => {
    try {
      await remindArchiveDue(record.volumeId)
      message.success('催办通知已发送')
    } catch (error) {
      showUserError(error, '催办失败')
    }
  })()
}

async function downloadReviewerTransferPackage() {
  const fileId = reviewerDetail.value?.latestTransferRecord?.transferPackageFileId
  if (!fileId) return
  try {
    await downloadFile({ nodeId: fileId })
  } catch (error) {
    showUserError(error, '下载移交包失败')
  }
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

function goCreateOffline() {
  void router.push({ name: 'TeacherArchiveVolumeCreateOffline' })
}

function handleSignalMetricClick(key: string) {
  if (listTab.value === 'mine') {
    if (key === 'collecting') {
      filterExtras.integrityFailedOnly = false
      filterExtras.archiveOverdueOnly = false
      filterForm.volumeStatus = 'COLLECTING'
      filterForm.integrityStatus = undefined
      filterForm.transferStatus = undefined
      handleSearch()
      return
    }
    if (key === 'missing') {
      filterExtras.integrityFailedOnly = true
      filterExtras.archiveOverdueOnly = false
      filterForm.volumeStatus = undefined
      filterForm.integrityStatus = undefined
      filterForm.transferStatus = undefined
      handleSearch()
      return
    }
    if (key === 'overdue') {
      filterExtras.archiveOverdueOnly = true
      filterExtras.integrityFailedOnly = false
      filterForm.volumeStatus = undefined
      filterForm.integrityStatus = undefined
      filterForm.transferStatus = undefined
      handleSearch()
      return
    }
    if (key === 'remediation') {
      const task = openRemediationTasks.value[0]
      if (task) {
        goRemediationVolume(task)
      }
    }
    return
  }
  if (key !== 'overdue') return
  if (!canViewCollegeBoard.value && !canViewArchiveReviewer.value) return
  listTab.value = 'archive'
  archiveSubTab.value = 'overdue'
}

watch(listTab, (tab) => {
  const nextQuery: LocationQueryRaw = { ...route.query, tab }
  delete nextQuery.scope
  void router.replace({ query: nextQuery })
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

watch([listTab, archiveSubTab], (values) => {
  clearScenario()
  applyScopedDepartmentDefault()
  const [tab, subTab] = values
  if (tab !== 'mine') {
    filterExtras.integrityFailedOnly = false
    filterExtras.archiveOverdueOnly = false
  }
  if (subTab === 'due-appraisal') {
    filterForm.appraisalStatus = undefined
  }
  if (subTab === 'overdue') {
    filterForm.volumeStatus = undefined
    filterForm.integrityStatus = undefined
    filterForm.transferStatus = undefined
    filterForm.appraisalStatus = undefined
    filterForm.sourceType = undefined
  }
  pagination.pageNum = 1
  selectedVolumeIds.value = []
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    void loadOpenRemediationTasks()
  }
  if (showVolumeListPanel.value) {
    void loadVolumes()
  }
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
      path: '/teacher/archive-volumes',
      query: { tab: 'settings', settingsTab: 'templateSets' },
    })
    return
  }
  if (listTab.value === 'mine' && volumeScope.value === 'mine') {
    await loadOpenRemediationTasks()
  }
  if (showVolumeListPanel.value && !setupBlocking.value) {
    await loadVolumes()
    if (listTab.value !== 'mine' && showSignalBand.value) {
      await loadSignalKpis()
    }
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

.archive-volume-list__sub-tabs {
  margin-bottom: var(--dp-space-2, 8px);
}

.archive-volume-list__batch {
  margin-bottom: var(--dp-space-2, 8px);
}

.archive-volume-list__filter {
  width: 100%;
}

.archive-volume-list__filter--context {
  width: 100%;
}

.archive-volume-list__scope-bar {
  display: flex;
  align-items: center;
  padding-bottom: var(--dp-space-3, 12px);
  margin-bottom: var(--dp-space-3, 12px);
  border-bottom: 1px solid var(--dp-border, #e2e8f0);
}

.status-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-1, 4px);
}

.archive-volume-list__drawer-title {
  margin: 0 0 var(--dp-space-1, 4px);
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-list__drawer-meta {
  margin: 0 0 var(--dp-space-3, 12px);
  color: var(--dp-color-text-secondary, #666);
  font-size: 13px;
}

.archive-volume-list__drawer-tags {
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-volume-list__drawer-line {
  margin: 0 0 var(--dp-space-3, 12px);
  font-size: 14px;
}

.archive-volume-list__drawer-actions {
  display: flex;
  gap: var(--dp-space-2, 8px);
}

.link-cell__sub {
  color: var(--dp-text-muted, #64748b);
  font-size: 12px;
}
</style>
