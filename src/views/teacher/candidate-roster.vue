<template>
  <StageWorkbenchShell class="roster-page">
    <template v-if="selectedExamId && showRosterContextBar" #context>
      <ContextBar layout="workbench" show-title title="考生名册">
        <template #status>
          <UiTag v-if="rosterPanel?.filterScopeApplied" tone="blue" size="sm">筛选范围内</UiTag>
          <UiTag v-if="rosterLocked === true" tone="orange" size="sm">已有扫描</UiTag>
          <UiTag v-else-if="archiveClassScopeRecoveryAllowed === true" tone="orange" size="sm">
            关考后可修正
          </UiTag>
          <UiTag v-else-if="classScopeReadOnly === true" tone="gray" size="sm">只读</UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand compact variant="panel" :metrics="rosterSignalMetrics" />
    </template>

    <ExamSelectGateStrip
      v-if="!selectedExamId"
      body="请选择需要维护考生名册的考试"
      class="roster-page__empty"
    />

    <UiSkeletonState
      v-else-if="contextLoading"
      variant="card"
      :card-count="2"
      compact
      class="roster-page__loading"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard class="exam-scope-card">
        <template #head>
          <div class="exam-scope-card__head">
            <h3 class="exam-scope-card__title">
              <TeamOutlined />
              <span>考试范围</span>
            </h3>
            <UiButton
              v-if="canAddClassScope === true"
              size="sm"
              variant="outline"
              @click="openAddClassModal"
            >
              <template #icon><PlusOutlined /></template>
              新增班级
            </UiButton>
          </div>
        </template>

        <div class="exam-scope-meta">
          <div class="exam-scope-meta__item">
            <span class="exam-scope-meta__label">纳入方式</span>
            <span class="exam-scope-meta__value">{{ rosterScopeModeDisplay || '—' }}</span>
          </div>
          <div class="exam-scope-meta__item">
            <span class="exam-scope-meta__label">参考院系</span>
            <span class="exam-scope-meta__value">{{ referenceDepartmentName || '—' }}</span>
          </div>
        </div>

        <div class="exam-scope-classes">
          <div class="exam-scope-classes__head">
            <span class="exam-scope-classes__title">参考班级</span>
            <span v-if="scopedClassTags.length" class="exam-scope-classes__count">{{ scopedClassTags.length }} 个</span>
          </div>
          <div v-if="scopedClassTags.length" class="exam-scope-classes__tags">
            <UiTag v-for="item in scopedClassTags" :key="item.classId" tone="blue" size="sm">
              {{ item.className }}
            </UiTag>
          </div>
          <UiEmpty
            v-else
            size="sm"
            description="尚未配置参考班级"
            class="exam-scope-classes__empty"
          />
        </div>
      </WorkbenchSurfaceCard>

      <UiAlertStrip
        v-if="showInferredClassScopeNotice"
        tone="warning"
        title="参考班级尚未保存"
        description="当前班级来自名册或已绑定卷推断，扫描、导出与归档将使用这些班级；建议保存为正式参考班级。"
        dense
      >
        <template #actions>
          <UiButton
            variant="primary"
            size="sm"
            :loading="persistClassScopeSaving"
            :disabled="classScopeReadOnly === true"
            @click="persistInferredClassScope"
          >
            保存为参考班级
          </UiButton>
        </template>
      </UiAlertStrip>

      <UiAlertStrip
        v-if="archiveClassScopeRecoveryAllowed === true"
        tone="warning"
        title="自动建卷失败，可修正参考班级"
        description="关考后不可增删考生，仅可修正参考班级。保存后系统将自动重触发建卷。"
        dense
      />

      <WorkbenchSurfaceCard class="roster-page__table-card" flush>
        <template v-if="candidateRosterWriteAllowed === true" #toolbar>
          <div class="roster-page__filter-stack">
            <div
              v-if="allowsManualCandidateEdit"
              class="roster-page__actions-row dp-space"
              style="--dp-space-gap: 8px"
            >
              <UiButton
                size="sm"
                variant="outline"
                :disabled="!classIds.length"
                @click="openSelectDrawer"
              >
                <template #icon><UserAddOutlined /></template>
                从学生库选择
              </UiButton>
              <UiButton size="sm" variant="outline" @click="openImportModal">
                <template #icon><UploadOutlined /></template>
                批量导入考生
              </UiButton>
              <UiButton size="sm" variant="primary" @click="openSingleAddModal">
                <template #icon><PlusOutlined /></template>
                添加单个考生
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :loading="fullScopeSaving"
                :disabled="!classIds.length || candidateTotal === 0"
                @click="confirmSaveFullScope"
              >
                全量保存名册
              </UiButton>
            </div>
            <UiFilterBar
              variant="plain"
              :model-value="rosterFilterForm"
              :fields="rosterFilterFields"
              search-text="查询"
              @update:model-value="syncRosterFilterForm"
              @search="handleRosterSearch"
              @reset="handleRosterReset"
            />
            <div class="roster-page__filter-chips">
              <button
                v-for="chip in rosterScanFilterChips"
                :key="chip.value ?? 'all'"
                type="button"
                class="roster-page__filter-chip"
                :class="{ 'roster-page__filter-chip--active': scanProgressFilter === chip.value }"
                @click="toggleScanProgressFilter(chip.value)"
              >
                {{ chip.label }}
                <span v-if="chip.count != null" class="roster-page__filter-chip-count">{{
                  chip.count
                }}</span>
              </button>
            </div>
          </div>
        </template>
        <template v-else #toolbar>
          <UiFilterBar
            variant="plain"
            :model-value="rosterFilterForm"
            :fields="rosterFilterFields"
            search-text="查询"
            @update:model-value="syncRosterFilterForm"
            @search="handleRosterSearch"
            @reset="handleRosterReset"
          />
          <div class="roster-page__filter-chips">
            <button
              v-for="chip in rosterScanFilterChips"
              :key="chip.value ?? 'all'"
              type="button"
              class="roster-page__filter-chip"
              :class="{ 'roster-page__filter-chip--active': scanProgressFilter === chip.value }"
              @click="toggleScanProgressFilter(chip.value)"
            >
              {{ chip.label }}
              <span v-if="chip.count != null" class="roster-page__filter-chip-count">{{
                chip.count
              }}</span>
            </button>
          </div>
        </template>

        <ExamCandidateWorkbenchTable
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :items="tableCandidates"
          :loading="tableLoading"
          :total="pagination.total ?? 0"
          :show-remove-action="allowsManualCandidateEdit === true && candidateRosterWriteAllowed === true"
          @page-change="handlePageChange"
          @action="handleWorkbenchAction"
        />
      </WorkbenchSurfaceCard>
    </template>

    <ClassStudentTreeSelectorDrawer
      v-model="selectDrawerOpen"
      title="选择考试考生"
      :exam-id="selectedExamId ?? undefined"
      :allowed-class-ids="classIds"
      :excluded-student-ids="rosterStudentUserIds"
      @confirm="handleStudentsSelected"
    />
    <UiPlatformExcelImportModal
      v-model:open="showImportModal"
      :scene-key="ExcelImportSceneKey.MARK_ROSTER_EXCEL"
      entity-label="考生名册"
      :context="importExcelContext"
      preview-before-commit
      :requirements="rosterImportRequirements"
      @success="handleRosterImportSuccess"
    />

    <UiDrawer
      v-model:open="singleAddOpen"
      title="添加考生"
      :width="520"
      :hide-footer="false"
      ok-text="加入名册"
      :confirm-loading="singleAddSubmitting === true"
      @ok="handleSingleAddSubmit"
    >
      <UiForm layout="vertical">
        <UiFormItem label="班级" required>
          <UiSelect
            size="sm"
            v-model="singleAddClassId"
            placeholder="请选择班级"
            :options="classSelectOptions"
            allow-search
            option-filter-prop="label"
            style="width: 100%"
          />
        </UiFormItem>
        <UiFormItem label="学生" required>
          <StudentSelector
            v-model:value="singleAddStudentUserId"
            :class-id="singleAddClassId"
            :exam-id="selectedExamId"
            width="100%"
            @change="handleSingleStudentChange"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <UiDrawer
      v-model:open="addClassModalOpen"
      title="新增参考班级"
      :width="520"
      :hide-footer="false"
      ok-text="确认新增"
      :confirm-loading="addClassSubmitting === true"
      @ok="handleAddClassSubmit"
    >
      <UiForm layout="vertical">
        <UiFormItem label="参考院系">
          <span class="exam-scope-meta__value">{{ referenceDepartmentName || '—' }}</span>
        </UiFormItem>
        <UiFormItem label="班级" required>
          <UiSelect
            size="sm"
            v-model="pendingAddClassIds"
            mode="multiple"
            placeholder="选择要新增的班级"
            :options="addableClassOptions"
            :loading="classOptionsLoading"
            allow-search
            option-filter-prop="label"
            style="width: 100%"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <ExamCandidatePaperImagesDrawer
      v-model:open="paperImagesOpen"
      :exam-id="selectedExamId ?? undefined"
      :candidate="paperImagesCandidate"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
// MVR-948：本地 can* 显隐/禁用仅认 === true
import type { TablePaginationConfig } from 'ant-design-vue/es/table'
import type { ClassStudentTreeConfirmPayload } from '@/apis/edu/class'
import type { ExamClassRefVO } from '@/apis/mark/exam'
import type { ExamCandidateRosterWorkbenchItemResponse } from '@/apis/mark/exam-candidate-roster'
import type {
  ExamWorkbenchCandidateRosterPanelQueryRequest,
  ExamWorkbenchCandidateRosterPanelResponse,
} from '@/apis/mark/exam-progress'
import type { ExamCandidateRosterRequest } from '@/apis/mark/exam-scope'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { UserDto } from '@/types/api-types.d'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import message from 'ant-design-vue/es/message'
import { useRouter } from 'vue-router'
import { ExamRosterScopeModeDescription, ExamStatusCode, getExamDetail } from '@/apis/mark/exam'
import { pageCandidateRosterWorkbench } from '@/apis/mark/exam-candidate-roster'
import { getCandidateRosterPanel } from '@/apis/mark/exam-progress'
import { pageScannerBatches } from '@/apis/mark/exam-scan'
import {
  listExamCandidateStudentUserIds,
  mergeExamCandidates,
  previewExamCandidates,
  removeExamCandidates,
  saveCurrentExamScope,
  saveExamClassScope,
} from '@/apis/mark/exam-scope'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import ExamCandidatePaperImagesDrawer from '@/components/exam-workbench/ExamCandidatePaperImagesDrawer.vue'
import ExamCandidateWorkbenchTable from '@/components/exam-workbench/ExamCandidateWorkbenchTable.vue'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import StudentSelector from '@/components/quality/selectors/StudentSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamDepartmentClassScope } from '@/composables/useExamDepartmentClassScope'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { CandidateScanProgressStatusCode } from '@/types/enums/candidate-scan-progress-status-enum'
import { ExamRosterScopeModeCode } from '@/types/enums/exam-roster-scope-mode-enum'
import {
  ErrorType,
  handleError,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { buildScopedClassTags } from './candidate-roster/class-scope'
import {
  buildExamCandidateMergeRequests,
  examCandidateRosterRequestFromUser,
} from './candidate-roster/roster-merge'

defineOptions({ name: 'TeacherCandidateRoster' })

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const router = useRouter()

const classIds = ref<string[]>([])
const classScopePersisted = ref(true)
const examStatus = ref<ExamStatusCode | null>(null)
const archiveClassScopeRecoveryAllowed = ref(false)
const examClassRefs = ref<ExamClassRefVO[]>([])
const classScopeHydrating = ref(false)
const lastSavedClassIds = ref<string[]>([])
const rosterLocked = ref(false)
const rosterWriteForbidden = ref(false)
/** MVR-280：默认拒绝假可写；仅 BE 名册看板 canManageRosterWrites=true 时可写 */
const canManageRosterWrites = ref(false)
const rosterScopeMode = ref<ExamRosterScopeModeCode | undefined>(undefined)
const referenceDepartmentName = ref<string | undefined>(undefined)
const candidateTotal = ref(0)
const rosterPanel = ref<ExamWorkbenchCandidateRosterPanelResponse | null>(null)
let classScopeSaveTimer: ReturnType<typeof setTimeout> | null = null
let loadContextSeq = 0
let loadTableSeq = 0

const { departmentId, classOptionsLoading, classSelectOptions, loadClassesForDepartment }
  = useExamDepartmentClassScope({
    selectedClassIds: classIds,
    seedOptions: computed(() =>
      examClassRefs.value.flatMap((item) => {
        if (!item.classId || !item.className) {
          return []
        }
        return [{ classId: item.classId, className: item.className }]
      }),
    ),
  })

const tableCandidates = ref<ExamCandidateRosterWorkbenchItemResponse[]>([])
const scanProgressFilter = ref<CandidateScanProgressStatusCode | undefined>(undefined)
const paperImagesOpen = ref(false)
const paperImagesCandidate = ref<ExamCandidateRosterWorkbenchItemResponse | null>(null)
const rosterStudentUserIds = ref<string[]>([])
const contextLoading = ref(false)
const fullScopeSaving = ref(false)
const persistClassScopeSaving = ref(false)
const tableLoading = ref(false)
const removingStudentUserId = ref<string | null>(null)
const singleAddSubmitting = ref(false)

const rosterFilterForm = reactive<{
  keyword: string
  classId?: string
}>({
  keyword: '',
  classId: undefined,
})

function syncRosterFilterForm(next: Record<string, unknown>): void {
  Object.assign(rosterFilterForm, next)
}

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const rosterSignalMetrics = computed((): SignalMetric[] => {
  const panel = rosterPanel.value
  if (panel) {
    const scoped = panel.filterScopeApplied
    const metrics: SignalMetric[] = [
      {
        key: 'total',
        label: scoped ? '筛选人数' : '总人数',
        value: panel.totalCount,
        unit: '人',
        tone: 'blue',
      },
      {
        key: 'active',
        label: '正常',
        value: panel.activeCount,
        unit: '人',
        tone: 'green',
      },
      {
        key: 'not-scanned',
        label: '未扫描',
        value: panel.notScannedCount,
        unit: '人',
        tone: panel.notScannedCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'bound',
        label: '已绑定',
        value: panel.boundCount,
        unit: '人',
        tone: 'blue',
      },
      {
        key: 'absent',
        label: '缺考',
        value: panel.absentCount,
        unit: '人',
        tone: panel.absentCount > 0 ? 'red' : 'gray',
      },
      {
        key: 'classes',
        label: scoped ? '涉及班级' : '参考班级',
        value: panel.classCount,
        unit: '个',
        tone: 'gray',
      },
    ]
    if (panel.attendanceRate != null) {
      metrics.push({
        key: 'attendance',
        label: '参考率',
        value: `${panel.attendanceRate}%`,
        tone: panel.attendanceRate >= 90 ? 'green' : 'orange',
      })
    }
    return metrics
  }
  const fallbackMetrics: SignalMetric[] = []
  if (candidateTotal.value > 0) {
    fallbackMetrics.push({
      key: 'total',
      label: '名册人数',
      value: candidateTotal.value,
      unit: '人',
      tone: 'blue',
    })
  }
  if (classIds.value.length > 0) {
    fallbackMetrics.push({
      key: 'classes',
      label: '参考班级',
      value: classIds.value.length,
      unit: '个',
      tone: 'gray',
    })
  }
  fallbackMetrics.push({
    key: 'locked',
    label: '名册状态',
    value: rosterLocked.value === true ? '已锁定' : '可编辑',
    tone: rosterLocked.value === true ? 'orange' : 'green',
  })
  return fallbackMetrics
})

const selectDrawerOpen = ref(false)
const showImportModal = ref(false)
const singleAddOpen = ref(false)
const addClassModalOpen = ref(false)
const pendingAddClassIds = ref<string[]>([])
const addClassSubmitting = ref(false)
const singleAddClassId = ref<string | undefined>(undefined)
const singleAddStudentUserId = ref<string | null>(null)
const singleAddStudent = ref<UserDto | null>(null)

const classScopeReadOnly = computed(() => {
  // MVR-280：无 BE 名册写能力位时整页只读（含班级范围保存）
  if (canManageRosterWrites.value !== true) {
    return true
  }
  if (rosterWriteForbidden.value === true) {
    return true
  }
  if (examStatus.value === ExamStatusCode.CLOSED) {
    return archiveClassScopeRecoveryAllowed.value !== true
  }
  return false
})

const showRosterContextBar = computed(
  () => rosterLocked.value === true || archiveClassScopeRecoveryAllowed.value === true || classScopeReadOnly.value === true,
)

const candidateRosterWriteAllowed = computed(
  () =>
    canManageRosterWrites.value === true
    && examStatus.value !== ExamStatusCode.CLOSED
    && classScopeReadOnly.value !== true
    && rosterLocked.value !== true,
)

const allowsManualCandidateEdit = computed(
  () => rosterScopeMode.value !== ExamRosterScopeModeCode.BY_CLASS,
)

const rosterScopeModeDisplay = computed(() => {
  if (!rosterScopeMode.value) {
    return undefined
  }
  return strictEnumLabel(ExamRosterScopeModeDescription, rosterScopeMode.value, '名册范围模式')
})

const canAddClassScope = computed(() => classScopeReadOnly.value !== true && Boolean(departmentId.value))

const addableClassOptions = computed(() =>
  classSelectOptions.value.filter((item) => !classIds.value.includes(item.value)),
)

const showInferredClassScopeNotice = computed(
  () => classScopeReadOnly.value !== true && classScopePersisted.value !== true && classIds.value.length > 0,
)

const scopedClassTags = computed(() =>
  buildScopedClassTags(classIds.value, examClassRefs.value, classSelectOptions.value),
)

const rosterClassFilterOptions = computed(() =>
  scopedClassTags.value.map((item) => ({
    value: item.classId,
    label: item.className,
  })),
)

interface RosterScanFilterChip {
  label: string
  value: CandidateScanProgressStatusCode | undefined
  count?: number
}

const rosterScanFilterChips = computed((): RosterScanFilterChip[] => {
  const panel = rosterPanel.value
  return [
    {
      label: '全部',
      value: undefined,
      count: panel?.totalCount,
    },
    {
      label: '未扫描',
      value: CandidateScanProgressStatusCode.NOT_SCANNED,
      count: panel?.notScannedCount,
    },
    {
      label: '已扫未绑',
      value: CandidateScanProgressStatusCode.SCANNED_UNBOUND,
      count: panel?.scannedUnboundCount,
    },
    {
      label: '已绑定',
      value: CandidateScanProgressStatusCode.BOUND,
      count: panel?.boundCount,
    },
    {
      label: '绑定冲突',
      value: CandidateScanProgressStatusCode.CONFLICT,
      count: panel?.conflictCount,
    },
    {
      label: '缺考',
      value: CandidateScanProgressStatusCode.ABSENT,
      count: panel?.absentCount,
    },
    {
      label: '待处理异常',
      value: CandidateScanProgressStatusCode.ATTENTION_OPEN,
      count: panel?.attentionOpenCount,
    },
    {
      label: '答卷废弃',
      value: CandidateScanProgressStatusCode.DISCARDED,
      count: panel?.discardedCount,
    },
  ]
})

function toggleScanProgressFilter(value: CandidateScanProgressStatusCode | undefined): void {
  scanProgressFilter.value = scanProgressFilter.value === value ? undefined : value
  pagination.current = 1
  void loadCandidatePage()
}

const rosterFilterFields = computed<FilterField[]>(() => [
  {
    key: 'keyword',
    type: 'input',
    placeholder: '按学号 / 姓名搜索',
    allowClear: true,
    width: 220,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
  {
    key: 'classId',
    type: 'select',
    placeholder: '全部班级',
    allowClear: true,
    allowSearch: true,
    width: 200,
    options: rosterClassFilterOptions.value.map((item) => ({
      label: item.label,
      value: item.value,
    })),
  },
])

const importExcelContext = computed(() => ({
  examId: selectedExamId.value,
  classIds: [...classIds.value],
}))

const rosterImportRequirements = [
  '请使用平台模板（院系、班级、学号、姓名四列）',
  '上传后先预览校验，确认无误再导入',
]

function isPermissionError(error: unknown): boolean {
  return handleError(error, { silent: true }).type === ErrorType.PERMISSION
}

function sameClassIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return sortedLeft.every((value, index) => value === sortedRight[index])
}

function buildClassScopeSavePayload(classIdList: string[]) {
  return {
    examId: selectedExamId.value!,
    classIds: [...classIdList],
    referenceDepartmentId: departmentId.value,
  }
}

async function probeRosterLocked(examId: string): Promise<boolean> {
  const result = await pageScannerBatches({ examId, pageNum: 1, pageSize: 1 })
  return result.total > 0
}

async function loadClassOptionsForExam(_examId: string): Promise<void> {
  if (departmentId.value) {
    await loadClassesForDepartment()
  }
}

async function openAddClassModal(): Promise<void> {
  // MVR-391：与 canManageRosterWrites / classScopeReadOnly 二次拦截
  if (canManageRosterWrites.value !== true || classScopeReadOnly.value === true) {
    void message.warning('当前账号或考试状态不可维护班级范围')
    return
  }
  if (!departmentId.value) {
    void message.warning('本场考试未配置参考院系，无法新增班级')
    return
  }
  if (!addableClassOptions.value.length) {
    await loadClassesForDepartment()
  }
  if (!addableClassOptions.value.length) {
    void message.warning('当前院系下没有可新增的班级')
    return
  }
  pendingAddClassIds.value = []
  addClassModalOpen.value = true
}

async function handleAddClassSubmit(): Promise<void> {
  // MVR-970：新增班级防重入
  if (addClassSubmitting.value === true) {
    return
  }
  // MVR-391：与 canManageRosterWrites / classScopeReadOnly 二次拦截
  if (canManageRosterWrites.value !== true || classScopeReadOnly.value === true) {
    void message.warning('当前账号或考试状态不可维护班级范围')
    return
  }
  if (!pendingAddClassIds.value.length) {
    showFormValidationMessage('请选择要新增的班级')
    return
  }
  addClassSubmitting.value = true
  try {
    classIds.value = [...new Set([...classIds.value, ...pendingAddClassIds.value])]
    addClassModalOpen.value = false
  } finally {
    addClassSubmitting.value = false
  }
}

async function loadRosterStudentIds(examId: string): Promise<void> {
  try {
    const response = await listExamCandidateStudentUserIds(examId)
    rosterStudentUserIds.value = response.studentUserIds
  } catch (error) {
    rosterStudentUserIds.value = []
    showUserError(error, '考生编号列表加载失败')
  }
}

async function loadCandidatePage(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const examId = selectedExamId.value
  const seq = ++loadTableSeq
  tableLoading.value = true
  try {
    const result = await pageCandidateRosterWorkbench({
      examId,
      keyword: rosterFilterForm.keyword.trim() || undefined,
      classId: rosterFilterForm.classId,
      scanProgressStatus: scanProgressFilter.value,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
    })
    if (seq !== loadTableSeq) {
      return
    }
    tableCandidates.value = result.list
    pagination.total = result.total
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
  } catch (error) {
    if (seq !== loadTableSeq) {
      return
    }
    showUserError(error, '考生列表加载失败')
  } finally {
    if (seq === loadTableSeq) {
      tableLoading.value = false
    }
  }
}

function buildRosterPanelQuery(examId: string): ExamWorkbenchCandidateRosterPanelQueryRequest {
  return {
    examId,
    classId: rosterFilterForm.classId,
    keyword: rosterFilterForm.keyword.trim() || undefined,
  }
}

async function reloadRosterData(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  await Promise.all([loadRosterPanel(selectedExamId.value), loadCandidatePage()])
}

async function reloadExamContext(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  await loadExamContext()
  await loadCandidatePage()
  await refreshSnapshot()
}

async function loadRosterPanel(examId: string): Promise<void> {
  try {
    const panel = await getCandidateRosterPanel(buildRosterPanelQuery(examId))
    rosterPanel.value = panel
    // MVR-280：缺省拒绝假可写
    canManageRosterWrites.value = panel.canManageRosterWrites === true
  } catch (error) {
    rosterPanel.value = null
    canManageRosterWrites.value = false
    showUserError(error, '名册看板加载失败')
  }
}

async function loadExamContext(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const examId = selectedExamId.value
  const seq = ++loadContextSeq
  contextLoading.value = true
  rosterWriteForbidden.value = false
  canManageRosterWrites.value = false
  classScopeHydrating.value = true
  try {
    const detail = await getExamDetail(examId)
    try {
      rosterLocked.value = await probeRosterLocked(examId)
    } catch (error) {
      if (seq !== loadContextSeq) {
        return
      }
      rosterLocked.value = false
      showUserError(error, '名册锁定状态加载失败')
    }
    await loadRosterPanel(examId)
    if (seq !== loadContextSeq) {
      return
    }
    examStatus.value = detail.status
    rosterScopeMode.value = detail.rosterScopeMode
    archiveClassScopeRecoveryAllowed.value
      = detail.archiveAutoCreateClassScopeRecoveryAllowed === true
    examClassRefs.value = [...(detail.classRefs ?? [])]
    candidateTotal.value = detail.candidateCount ?? 0
    classIds.value = [...new Set(detail.classIds ?? [])]
    classScopePersisted.value = detail.classScopePersisted
    lastSavedClassIds.value = classScopePersisted.value ? [...classIds.value] : []
    referenceDepartmentName.value = detail.referenceDepartmentName
    if (detail.referenceDepartmentId) {
      departmentId.value = detail.referenceDepartmentId
    }
    await loadClassOptionsForExam(examId)
    if (seq !== loadContextSeq) {
      return
    }
    await loadRosterStudentIds(examId)
  } catch (error) {
    if (seq !== loadContextSeq) {
      return
    }
    showUserError(error, '考生名册加载失败')
  } finally {
    if (seq === loadContextSeq) {
      await nextTick()
      classScopeHydrating.value = false
      contextLoading.value = false
    }
  }
}

async function persistInferredClassScope(): Promise<void> {
  // MVR-316：与 BE requireExamRosterWritePermission / canManageRosterWrites 二次拦截
  if (canManageRosterWrites.value !== true) {
    void message.warning('当前账号无名册维护权限')
    return
  }
  if (
    !selectedExamId.value
    || !classIds.value.length
    || classScopeReadOnly.value === true
    || persistClassScopeSaving.value === true
  ) {
    return
  }
  persistClassScopeSaving.value = true
  try {
    await saveExamClassScope(buildClassScopeSavePayload(classIds.value))
    classScopePersisted.value = true
    lastSavedClassIds.value = [...classIds.value]
    void message.success('参考班级已保存')
  } catch (error) {
    showUserError(error, '保存参考班级失败')
  } finally {
    persistClassScopeSaving.value = false
  }
}

function handleRosterSearch(): void {
  pagination.current = 1
  void reloadRosterData()
}

function handleRosterReset(): void {
  scanProgressFilter.value = undefined
  pagination.current = 1
  void reloadRosterData()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadCandidatePage()
}

function openSelectDrawer(): void {
  // MVR-316：批量纳入考生与名册写能力位同源
  if (candidateRosterWriteAllowed.value !== true) {
    void message.warning('当前账号无考生名册写权限')
    return
  }
  if (!classIds.value.length) {
    showFormValidationMessage('请先选择班级范围')
    return
  }
  selectDrawerOpen.value = true
}

function openImportModal(): void {
  if (canManageRosterWrites.value !== true) {
    void message.warning('当前账号无名册维护权限')
    return
  }
  showImportModal.value = true
}

async function handleRosterImportSuccess(): Promise<void> {
  showImportModal.value = false
  await reloadExamContext()
}

async function mergeCandidatesWithPreview(
  candidates: ExamCandidateRosterRequest[],
): Promise<number> {
  // MVR-318：内部合并入口与 candidateRosterWriteAllowed 同源
  if (candidateRosterWriteAllowed.value !== true) {
    void message.warning('当前账号无考生名册写权限')
    return 0
  }
  if (!selectedExamId.value || !candidates.length) {
    return 0
  }
  await previewExamCandidates({
    examId: selectedExamId.value,
    classIds: [...classIds.value],
    candidates,
  })
  await mergeExamCandidates({ examId: selectedExamId.value, candidates })
  return candidates.length
}

async function confirmSaveFullScope(): Promise<void> {
  // MVR-316：与 candidateRosterWriteAllowed / BE requireExamRosterWritePermission 二次拦截
  if (candidateRosterWriteAllowed.value !== true) {
    void message.warning('当前账号无考生名册写权限')
    return
  }
  if (!selectedExamId.value || !classIds.value.length) {
    showFormValidationMessage('请先选择班级范围')
    return
  }
  if (fullScopeSaving.value === true) {
    return
  }
  const confirmed = await confirmAsync({
    title: '全量保存考生名册？',
    content: '将当前班级范围与库内全部考生一次性写入后端，覆盖增量编辑结果。扫描已开始后可能失败。',
    type: 'warning',
    okText: '全量保存',
    cancelText: '取消',
    onOk: async () => {
      // MVR-936：确认后再次认 candidateRosterWriteAllowed
      if (candidateRosterWriteAllowed.value !== true) {
        void message.warning('当前账号无考生名册写权限')
        return false
      }
      if (!selectedExamId.value || !classIds.value.length) {
        showFormValidationMessage('请先选择班级范围')
        return false
      }
      fullScopeSaving.value = true
      try {
        await saveCurrentExamScope({
          examId: selectedExamId.value!,
          classIds: [...classIds.value],
          referenceDepartmentId: departmentId.value,
        })
        void message.success('已全量保存考生名册')
        await reloadExamContext()
      } catch (error) {
        showUserError(error, '全量保存名册失败')
        return false
      } finally {
        fullScopeSaving.value = false
      }
    },
  })
  void confirmed
}

async function handleStudentsSelected(selection: ClassStudentTreeConfirmPayload): Promise<void> {
  // MVR-316：抽屉确认纳入须二次拦截，避免绕过工具栏可见性
  if (candidateRosterWriteAllowed.value !== true) {
    void message.warning('当前账号无考生名册写权限')
    return
  }
  if (!selectedExamId.value) {
    return
  }
  if (contextLoading.value === true) {
    return
  }
  const mergeRequest = buildExamCandidateMergeRequests(
    selection.studentsInfo,
    rosterStudentUserIds.value,
  )
  if (!mergeRequest.length) {
    void message.warning('所选学生均已在名册中或缺少班级信息')
    return
  }
  contextLoading.value = true
  try {
    const mergedCount = await mergeCandidatesWithPreview(mergeRequest)
    void message.success(`已纳入 ${mergedCount} 名考生`)
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '纳入考生失败')
  } finally {
    contextLoading.value = false
  }
}

function openSingleAddModal(): void {
  if (canManageRosterWrites.value !== true) {
    void message.warning('当前账号无名册维护权限')
    return
  }
  singleAddClassId.value = classIds.value[0]
  singleAddStudentUserId.value = null
  singleAddStudent.value = null
  singleAddOpen.value = true
}

function handleSingleStudentChange(_userId: string | null, option?: UserDto): void {
  singleAddStudent.value = option ?? null
}

async function handleSingleAddSubmit(): Promise<void> {
  // MVR-316：单人加入名册与 candidateRosterWriteAllowed 同源二次拦截
  if (candidateRosterWriteAllowed.value !== true) {
    void message.warning('当前账号无考生名册写权限')
    return
  }
  if (!selectedExamId.value) {
    return
  }
  if (singleAddSubmitting.value === true) {
    return
  }
  if (!singleAddClassId.value) {
    showFormValidationMessage('请选择班级')
    return
  }
  const student = singleAddStudent.value
  if (!student?.id) {
    showFormValidationMessage('请选择学生')
    return
  }
  const studentUserId = String(student.id).trim()
  if (rosterStudentUserIds.value.includes(studentUserId)) {
    void message.warning('该学生已在名册中')
    return
  }
  singleAddSubmitting.value = true
  try {
    await mergeCandidatesWithPreview([
      examCandidateRosterRequestFromUser(singleAddClassId.value, student),
    ])
    void message.success('已加入名册')
    singleAddOpen.value = false
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '加入考生失败')
  } finally {
    singleAddSubmitting.value = false
  }
}

function handleWorkbenchAction(
  key: string,
  record: ExamCandidateRosterWorkbenchItemResponse,
): void {
  if (key === 'view-images') {
    if (!record.paperInstanceId) {
      return
    }
    paperImagesCandidate.value = record
    paperImagesOpen.value = true
    return
  }
  if (key === 'handle-attention') {
    if (!selectedExamId.value) {
      return
    }
    void router.push({
      name: 'TeacherExamWorkspaceScanMonitor',
      params: { examId: selectedExamId.value },
      query: {
        tab: 'abnormal',
        ...(record.paperInstanceId ? { paperInstanceId: record.paperInstanceId } : {}),
      },
    })
    return
  }
  if (key === 'supplement-missing') {
    if (!selectedExamId.value) {
      return
    }
    void router.push({
      name: 'TeacherExamWorkspaceScanManualEntry',
      params: { examId: selectedExamId.value },
      query: {
        scenario: 'missing-page',
        ...(record.paperInstanceId ? { paperInstanceId: record.paperInstanceId } : {}),
        ...(record.scanBatchId ? { scanBatchId: record.scanBatchId } : {}),
        candidateRosterId: record.candidateRosterId,
      },
    })
    return
  }
  if (key === 'remove') {
    // MVR-313：与 candidateRosterWriteAllowed / BE requireExamRosterWritePermission 同源
    if (candidateRosterWriteAllowed.value !== true) {
      return
    }
    void confirmAsync({
      title: '确认移除该考生？',
      content: '移除后需重新加入名册。',
      type: 'warning',
      onOk: async () => {
        // MVR-965：onOk 再认 candidateRosterWriteAllowed，防确认等待期间写权/锁定漂移
        if (candidateRosterWriteAllowed.value !== true) {
          void message.warning('当前账号无考生名册写权限或名册已锁定')
          return
        }
        await removeCandidate(record.studentUserId)
      },
    })
  }
}

async function removeCandidate(studentUserId: string): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  // MVR-313：写 handler 二次拦截
  if (candidateRosterWriteAllowed.value !== true) {
    void message.warning('当前账号无考生名册写权限')
    return
  }
  if (removingStudentUserId.value) {
    return
  }
  removingStudentUserId.value = studentUserId
  try {
    await removeExamCandidates({
      examId: selectedExamId.value,
      studentUserIds: [studentUserId],
    })
    void message.success('已移除')
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '移除考生失败')
  } finally {
    removingStudentUserId.value = null
  }
}

watch(classIds, (ids) => {
  if (classScopeHydrating.value === true || !selectedExamId.value || classScopeReadOnly.value === true) {
    return
  }
  // MVR-394：自动保存班级范围与 canManageRosterWrites 二次拦截（classScopeReadOnly 已含，显式默认拒绝）
  if (canManageRosterWrites.value !== true) {
    return
  }
  if (sameClassIds(ids, lastSavedClassIds.value)) {
    return
  }
  if (classScopeSaveTimer) {
    clearTimeout(classScopeSaveTimer)
  }
  const previous = [...lastSavedClassIds.value]
  classScopeSaveTimer = setTimeout(() => {
    classScopeSaveTimer = null
    void saveExamClassScope(buildClassScopeSavePayload(ids))
      .then(async () => {
        lastSavedClassIds.value = [...ids]
        classScopePersisted.value = true
        if (archiveClassScopeRecoveryAllowed.value) {
          void message.success('班级范围已保存，系统正在重新触发自动建卷')
          void router.push({
            name: 'TeacherExamWorkspaceArchivePackage',
            params: { examId: selectedExamId.value! },
            query: { autoCreatePoll: '1' },
          })
        }
        examClassRefs.value = ids.map((classId) => {
          const existing = examClassRefs.value.find((item) => item.classId === classId)
          const option = classSelectOptions.value.find((item) => item.value === classId)
          return {
            classId,
            className: existing?.className ?? option?.label ?? classId,
          }
        })
        await loadCandidatePage()
      })
      .catch(async (error) => {
        if (isPermissionError(error)) {
          rosterWriteForbidden.value = true
        }
        classScopeHydrating.value = true
        classIds.value = [...previous]
        lastSavedClassIds.value = [...previous]
        await nextTick()
        classScopeHydrating.value = false
        showUserError(error, '保存班级范围失败')
      })
  }, 400)
})

watch(
  selectedExamId,
  (value) => {
    if (classScopeSaveTimer) {
      clearTimeout(classScopeSaveTimer)
      classScopeSaveTimer = null
    }
    rosterLocked.value = false
    rosterWriteForbidden.value = false
    scanProgressFilter.value = undefined
    rosterFilterForm.keyword = ''
    rosterFilterForm.classId = undefined
    pagination.current = 1
    if (value) {
      void loadExamContext().then(() => loadCandidatePage())
    } else {
      rosterPanel.value = null
      classIds.value = []
      examClassRefs.value = []
      lastSavedClassIds.value = []
      tableCandidates.value = []
      rosterStudentUserIds.value = []
      rosterScopeMode.value = undefined
      referenceDepartmentName.value = undefined
      departmentId.value = undefined
      candidateTotal.value = 0
      pagination.total = 0
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.roster-page {
  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  &__table-card {
    margin-bottom: 0;
  }

  &__filter-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  &__actions-row {
    flex-wrap: wrap;
  }

  &__filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    border: 1px solid var(--dp-border);
    border-radius: 4px;
    background: var(--dp-bg-container);
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
    cursor: pointer;

    &--active {
      border-color: var(--dp-color-primary);
      color: var(--dp-color-primary);
      font-weight: 600;
    }
  }

  &__filter-chip-count {
    font-variant-numeric: tabular-nums;
    color: inherit;
  }

  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
  padding: 8px 10px;
}

.exam-scope-card {
  margin-bottom: 0;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 16px;
    font-weight: var(--dp-font-weight-title);
    line-height: 1.5;
  }
}

.exam-scope-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-3, 12px);
  padding-bottom: 16px;
  border-bottom: 1px solid var(--dp-border-subtle);

  &__item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__label {
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__value {
    font-size: 14px;
    line-height: 1.5;
    font-weight: 500;
    color: var(--dp-text);
  }
}

.exam-scope-classes {
  padding-top: 16px;

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    color: var(--dp-text);
  }

  &__count {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    background: var(--dp-fill-quaternary);
    border-radius: 6px;
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }
}

.roster-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--dp-fill-quaternary);
    font-weight: 600;
  }
}

.roster-cell--muted {
  color: var(--dp-text-secondary);
}

.roster-student {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__name {
    font-weight: 500;
    color: var(--dp-text);
  }

  &__no {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }
}
</style>
