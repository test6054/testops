<template>
  <UiEmpty v-if="!selectedExamId" description="请选择需要维护的考试" class="roster-page__empty" />

  <a-spin v-else :spinning="contextLoading">
    <UiCard class="exam-scope-card">
      <template #title>
        <TeamOutlined />
        <span>考试范围</span>
        <UiTag v-if="rosterLocked" tone="orange" size="sm">已有扫描</UiTag>
        <UiTag v-else-if="archiveClassScopeRecoveryAllowed" tone="orange" size="sm">
          关考后可修正
        </UiTag>
        <UiTag v-else-if="classScopeReadOnly" tone="gray" size="sm">只读</UiTag>
      </template>
      <template v-if="canAddClassScope" #extra>
        <UiButton size="sm" variant="outline" @click="openAddClassModal">
          <template #icon><PlusOutlined /></template>
          新增班级
        </UiButton>
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
        <UiEmpty v-else description="尚未配置参考班级" class="exam-scope-classes__empty" />
      </div>
    </UiCard>

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
          :disabled="classScopeReadOnly"
          @click="persistInferredClassScope"
        >
          保存为参考班级
        </UiButton>
      </template>
    </UiAlertStrip>

    <UiAlertStrip
      v-if="archiveClassScopeRecoveryAllowed"
      tone="warning"
      title="自动建卷失败，可修正参考班级"
      description="关考后不可增删考生，仅可修正参考班级。保存后系统将自动重触发建卷。"
      dense
    />

    <UiCard class="roster-page__table-card">
      <template #title>
        <UserOutlined />
        <span>考生名册</span>
      </template>
      <template v-if="candidateRosterWriteAllowed" #extra>
        <a-space v-if="allowsManualCandidateEdit">
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
          <UiButton size="sm" @click="openSingleAddModal">
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
        </a-space>
      </template>

      <UiFilterBar
        variant="plain"
        :model-value="rosterFilterForm"
        :fields="rosterFilterFields"
        search-text="查询"
        @update:model-value="syncRosterFilterForm"
        @search="handleRosterSearch"
        @reset="handleRosterReset"
      />

      <UiDataTable
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        :columns="columns"
        :data-source="tableCandidates"
        :loading="tableLoading"
        :total="pagination.total"
        row-key="rowKey"
        size="middle"
        flat
        class="roster-table student-detail-table__data-table"
        bordered
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'student'">
            <div class="roster-student">
              <span class="roster-student__name">{{ tableCandidates[index].studentName }}</span>
              <span class="roster-student__no">{{ tableCandidates[index].studentNo }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'className'">
            <span class="roster-cell roster-cell--muted">
              {{ tableCandidates[index].className }}
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiConfirmPopover
                v-if="canRemoveCandidate(tableCandidates[index])"
                title="确认移除该考生？"
                description="移除后需重新加入名册。"
                danger
                @confirm="removeCandidate(tableCandidates[index].studentUserId)"
              >
                <UiTextAction tone="danger">移除</UiTextAction>
              </UiConfirmPopover>
              <span
                v-else-if="!tableCandidates[index].removable"
                class="muted"
                :title="tableCandidates[index].removalBlockReason"
              >
                不可移除
              </span>
              <span v-else class="muted">—</span>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </a-spin>

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

  <a-modal
    v-model:open="singleAddOpen"
    title="添加考生"
    ok-text="加入名册"
    :confirm-loading="singleAddSubmitting"
    :destroy-on-close="true"
    width="520px"
    @ok="handleSingleAddSubmit"
  >
    <a-form layout="vertical">
      <a-form-item label="班级" required>
        <a-select
          v-model:value="singleAddClassId"
          placeholder="请选择班级"
          :options="classSelectOptions"
          show-search
          option-filter-prop="label"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="学生" required>
        <StudentSelector
          v-model:value="singleAddStudentUserId"
          :class-id="singleAddClassId"
          :exam-id="selectedExamId"
          width="100%"
          @change="handleSingleStudentChange"
        />
      </a-form-item>
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="addClassModalOpen"
    title="新增参考班级"
    ok-text="确认新增"
    :confirm-loading="addClassSubmitting"
    :destroy-on-close="true"
    width="520px"
    @ok="handleAddClassSubmit"
  >
    <a-form layout="vertical">
      <a-form-item label="参考院系">
        <span class="exam-scope-meta__value">{{ referenceDepartmentName || '—' }}</span>
      </a-form-item>
      <a-form-item label="班级" required>
        <a-select
          v-model:value="pendingAddClassIds"
          mode="multiple"
          placeholder="选择要新增的班级"
          :options="addableClassOptions"
          :loading="classOptionsLoading"
          show-search
          option-filter-prop="label"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type { CandidateRow } from './candidate-roster/types'
import type { ClassStudentTreeConfirmPayload } from '@/apis/edu/class'
import type { ExamClassRefVO, ExamRosterScopeMode } from '@/apis/mark/exam'
import type { ExamCandidateRosterRequest } from '@/apis/mark/exam-scope'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { UserDto } from '@/types/api-types.d'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import { useRouter } from 'vue-router'
import { EXAM_ROSTER_SCOPE_MODE_LABEL, getExamDetail } from '@/apis/mark/exam'
import { pageScannerBatches } from '@/apis/mark/exam-scan'
import {
  listExamCandidates,
  mergeExamCandidates,
  pageExamCandidates,
  previewExamCandidates,
  removeExamCandidates,
  saveExamClassScope,
  saveExamScope,
} from '@/apis/mark/exam-scope'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import StudentSelector from '@/components/quality/selectors/StudentSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiConfirmPopover from '@/components/ui-guide/ui/UiConfirmPopover.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamDepartmentClassScope } from '@/composables/useExamDepartmentClassScope'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { ErrorType, handleError, showUserError } from '@/utils/error-handler'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { buildScopedClassTags } from './candidate-roster/class-scope'
import {
  buildExamCandidateMergeRequests,
  candidateRowFromExamCandidate,
  examCandidateRosterRequestFromUser,
} from './candidate-roster/roster-merge'

defineOptions({ name: 'TeacherCandidateRoster' })

const ROSTER_CANDIDATE_EXPORT_PAGE_SIZE = 100

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const router = useRouter()

const classIds = ref<string[]>([])
const classScopePersisted = ref(true)
const examStatus = ref<'ACTIVE' | 'CLOSED' | null>(null)
const archiveClassScopeRecoveryAllowed = ref(false)
const examClassRefs = ref<ExamClassRefVO[]>([])
const classScopeHydrating = ref(false)
const lastSavedClassIds = ref<string[]>([])
const rosterLocked = ref(false)
const rosterWriteForbidden = ref(false)
const rosterScopeMode = ref<ExamRosterScopeMode | undefined>(undefined)
const referenceDepartmentName = ref<string | undefined>(undefined)
const candidateTotal = ref(0)
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

const tableCandidates = ref<CandidateRow[]>([])
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
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
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
  if (rosterWriteForbidden.value) {
    return true
  }
  if (examStatus.value === 'CLOSED') {
    return !archiveClassScopeRecoveryAllowed.value
  }
  return false
})

const candidateRosterWriteAllowed = computed(
  () => examStatus.value !== 'CLOSED' && !classScopeReadOnly.value && !rosterLocked.value,
)

const allowsManualCandidateEdit = computed(() => rosterScopeMode.value !== 'BY_CLASS')

const rosterScopeModeDisplay = computed(() => {
  if (!rosterScopeMode.value) {
    return undefined
  }
  return EXAM_ROSTER_SCOPE_MODE_LABEL[rosterScopeMode.value]
})

const canAddClassScope = computed(() => !classScopeReadOnly.value && !!departmentId.value)

const addableClassOptions = computed(() =>
  classSelectOptions.value.filter((item) => !classIds.value.includes(item.value)),
)

const showInferredClassScopeNotice = computed(
  () => !classScopeReadOnly.value && !classScopePersisted.value && classIds.value.length > 0,
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

const columns = computed<ColumnType<CandidateRow>[]>(() => {
  const cols: ColumnType<CandidateRow>[] = [
    { title: '考生', key: 'student', width: 220 },
    { title: '班级', key: 'className', width: 200 },
  ]
  if (allowsManualCandidateEdit.value) {
    cols.push({ title: '操作', key: 'actions', width: 80, fixed: 'right' })
  }
  return cols
})

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
  return readPageTotal(result) > 0
}

async function loadClassOptionsForExam(_examId: string): Promise<void> {
  if (departmentId.value) {
    await loadClassesForDepartment()
  }
}

async function openAddClassModal(): Promise<void> {
  if (!departmentId.value) {
    message.warning('本场考试未配置参考院系，无法新增班级')
    return
  }
  if (!addableClassOptions.value.length) {
    await loadClassesForDepartment()
  }
  if (!addableClassOptions.value.length) {
    message.warning('当前院系下没有可新增的班级')
    return
  }
  pendingAddClassIds.value = []
  addClassModalOpen.value = true
}

async function handleAddClassSubmit(): Promise<void> {
  if (!pendingAddClassIds.value.length) {
    message.warning('请选择要新增的班级')
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
  const list = await listExamCandidates(examId)
  rosterStudentUserIds.value = list.map((item) => item.studentUserId)
}

async function loadCandidatePage(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const examId = selectedExamId.value
  const seq = ++loadTableSeq
  tableLoading.value = true
  try {
    const result = await pageExamCandidates({
      examId,
      keyword: rosterFilterForm.keyword.trim() || undefined,
      classId: rosterFilterForm.classId,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
    if (seq !== loadTableSeq) {
      return
    }
    tableCandidates.value = readPageList(result, '考生列表加载失败').map(candidateRowFromExamCandidate)
    pagination.total = readPageTotal(result)
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

async function reloadExamContext(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  await loadExamContext()
  await loadCandidatePage()
  await refreshSnapshot()
}

async function loadExamContext(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const examId = selectedExamId.value
  const seq = ++loadContextSeq
  contextLoading.value = true
  rosterWriteForbidden.value = false
  classScopeHydrating.value = true
  try {
    const [detail, locked] = await Promise.all([getExamDetail(examId), probeRosterLocked(examId)])
    if (seq !== loadContextSeq) {
      return
    }
    rosterLocked.value = locked
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
  if (!selectedExamId.value || !classIds.value.length || classScopeReadOnly.value) {
    return
  }
  persistClassScopeSaving.value = true
  try {
    await saveExamClassScope(buildClassScopeSavePayload(classIds.value))
    classScopePersisted.value = true
    lastSavedClassIds.value = [...classIds.value]
    message.success('参考班级已保存')
  } catch (error) {
    showUserError(error, '保存参考班级失败')
  } finally {
    persistClassScopeSaving.value = false
  }
}

function handleRosterSearch(): void {
  pagination.current = 1
  void loadCandidatePage()
}

function handleRosterReset(): void {
  pagination.current = 1
  void loadCandidatePage()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadCandidatePage()
}

function openSelectDrawer(): void {
  if (!classIds.value.length) {
    message.warning('请先选择班级范围')
    return
  }
  selectDrawerOpen.value = true
}

function openImportModal(): void {
  showImportModal.value = true
}

async function handleRosterImportSuccess(): Promise<void> {
  showImportModal.value = false
  await reloadExamContext()
}

async function mergeCandidatesWithPreview(
  candidates: ExamCandidateRosterRequest[],
): Promise<number> {
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

async function fetchAllRosterCandidates(): Promise<ExamCandidateRosterRequest[]> {
  const examId = selectedExamId.value
  if (!examId) {
    return []
  }
  const pages = await readAllPages(
    (pageNum) =>
      pageExamCandidates({
        examId,
        pageNum,
        pageSize: ROSTER_CANDIDATE_EXPORT_PAGE_SIZE,
      }),
    '考生名册加载失败',
  )
  const roster: ExamCandidateRosterRequest[] = []
  for (const item of pages) {
    const classId = String(item.classId ?? '').trim()
    const studentUserId = String(item.studentUserId ?? '').trim()
    if (!classId || !studentUserId) {
      continue
    }
    roster.push({ classId, studentUserId })
  }
  return roster
}

async function confirmSaveFullScope(): Promise<void> {
  if (!selectedExamId.value || !classIds.value.length) {
    message.warning('请先选择班级范围')
    return
  }
  const confirmed = await confirmAsync({
    title: '全量保存考生名册？',
    content: '将当前班级范围与全部考生一次性写入后端，覆盖增量编辑结果。扫描已开始后可能失败。',
    type: 'warning',
    okText: '全量保存',
    cancelText: '取消',
    onOk: async () => {
      fullScopeSaving.value = true
      try {
        const candidates = await fetchAllRosterCandidates()
        if (!candidates.length) {
          message.error('名册为空，无法全量保存')
          return false
        }
        await saveExamScope({
          examId: selectedExamId.value!,
          classIds: [...classIds.value],
          referenceDepartmentId: departmentId.value,
          candidates,
        })
        message.success(`已全量保存 ${candidates.length} 名考生`)
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
  if (!selectedExamId.value) {
    return
  }
  const mergeRequest = buildExamCandidateMergeRequests(
    selection.studentsInfo,
    rosterStudentUserIds.value,
  )
  if (!mergeRequest.length) {
    message.warning('所选学生均已在名册中或缺少班级信息')
    return
  }
  contextLoading.value = true
  try {
    const mergedCount = await mergeCandidatesWithPreview(mergeRequest)
    message.success(`已纳入 ${mergedCount} 名考生`)
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '纳入考生失败')
  } finally {
    contextLoading.value = false
  }
}

function openSingleAddModal(): void {
  singleAddClassId.value = classIds.value[0]
  singleAddStudentUserId.value = null
  singleAddStudent.value = null
  singleAddOpen.value = true
}

function handleSingleStudentChange(_userId: string | null, option?: UserDto): void {
  singleAddStudent.value = option ?? null
}

async function handleSingleAddSubmit(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  if (!singleAddClassId.value) {
    message.warning('请选择班级')
    return
  }
  const student = singleAddStudent.value
  if (!student?.id) {
    message.warning('请选择学生')
    return
  }
  const studentUserId = String(student.id).trim()
  if (rosterStudentUserIds.value.includes(studentUserId)) {
    message.warning('该学生已在名册中')
    return
  }
  singleAddSubmitting.value = true
  try {
    await mergeCandidatesWithPreview([
      examCandidateRosterRequestFromUser(singleAddClassId.value, student),
    ])
    message.success('已加入名册')
    singleAddOpen.value = false
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '加入考生失败')
  } finally {
    singleAddSubmitting.value = false
  }
}

function canRemoveCandidate(record: CandidateRow): boolean {
  if (!allowsManualCandidateEdit.value || !candidateRosterWriteAllowed.value) {
    return false
  }
  return record.removable !== false
}

async function removeCandidate(studentUserId: string): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  removingStudentUserId.value = studentUserId
  try {
    await removeExamCandidates({
      examId: selectedExamId.value,
      studentUserIds: [studentUserId],
    })
    message.success('已移除')
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '移除考生失败')
  } finally {
    removingStudentUserId.value = null
  }
}

watch(classIds, (ids) => {
  if (classScopeHydrating.value || !selectedExamId.value || classScopeReadOnly.value) {
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
          message.success('班级范围已保存，系统正在重新触发自动建卷')
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
    rosterFilterForm.keyword = ''
    rosterFilterForm.classId = undefined
    pagination.current = 1
    if (value) {
      void loadExamContext().then(() => loadCandidatePage())
    } else {
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
    padding: 60px 0;
  }

  &__table-card {
    margin-bottom: 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
}

.exam-scope-card {
  margin-bottom: 0;
}

.exam-scope-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ant-color-border-secondary);

  &__item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__label {
    font-size: 12px;
    line-height: 1.5;
    color: var(--ant-color-text-secondary);
  }

  &__value {
    font-size: 14px;
    line-height: 1.5;
    font-weight: 500;
    color: var(--ant-color-text);
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
    color: var(--ant-color-text);
  }

  &__count {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    background: var(--ant-color-fill-quaternary);
    border-radius: 6px;
  }

  &__empty {
    padding: 16px 0;
  }
}

.roster-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.roster-cell--muted {
  color: var(--ant-color-text-secondary);
}

.roster-student {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__name {
    font-weight: 500;
    color: var(--ant-color-text);
  }

  &__no {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}
</style>
