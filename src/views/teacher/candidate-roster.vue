<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="roster-page__context">
        <div class="roster-page__context-left">
          <a-select
            :value="selectedExamId"
            class="roster-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag v-if="selectedExamId" tone="blue" size="sm">{{ candidateTotal }} 名考生</UiTag>
        </div>
      </div>
    </template>

    <UiEmpty v-if="!selectedExamId" description="请选择需要维护的考试" class="roster-page__empty" />

    <UiErrorRetryPanel
      v-else-if="rosterLoadError"
      :error="rosterLoadError"
      title="考生名册加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="reloadExamContext"
    />

    <a-spin v-else :spinning="contextLoading">
      <UiCard class="info-card">
        <template #title>
          <TeamOutlined />
          <span>班级范围</span>
          <UiBadge tone="blue">{{ classIds.length }}</UiBadge>
          <UiTag v-if="rosterLocked" tone="orange" size="sm">扫描已开始</UiTag>
          <UiTag v-else-if="classScopeReadOnly" tone="gray" size="sm">只读</UiTag>
        </template>
        <UiAlertStrip
          v-if="classScopeReadOnly && !rosterLocked"
          tone="warning"
          title="当前账号无权维护该考试名册"
          description="班级范围与考生名册仅可查看，不可修改。"
          dense
          class="info-card__alert"
        />
        <div v-if="classScopeReadOnly" class="roster-class-tags">
          <UiTag v-for="item in scopedClassTags" :key="item.classId" tone="blue" size="sm">
            {{ item.className }}
          </UiTag>
          <span v-if="!scopedClassTags.length" class="roster-class-tags__empty"
            >尚未配置班级范围</span
          >
        </div>
        <a-select
          v-else
          v-model:value="classIds"
          mode="multiple"
          placeholder="选择参考班级（可多选）"
          :options="classSelectOptions"
          :loading="classOptionsLoading"
          show-search
          option-filter-prop="label"
          allow-clear
          class="info-card__class-select"
        />
      </UiCard>

      <UiCard class="info-card">
        <template #title>
          <UserOutlined />
          <span>考生名册</span>
          <UiBadge tone="blue">{{ pagination.total ?? 0 }}</UiBadge>
        </template>
        <template #extra>
          <a-space v-if="!classScopeReadOnly">
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!classIds.length"
              @click="openSelectDrawer"
            >
              <template #icon><UserAddOutlined /></template>
              从学生库选择
            </UiButton>
            <UiButton size="sm" variant="outline" @click="openBatchImportModal">
              <template #icon><UploadOutlined /></template>
              批量导入
            </UiButton>
            <UiButton size="sm" @click="openSingleAddModal">
              <template #icon><PlusOutlined /></template>
              添加单个
            </UiButton>
          </a-space>
        </template>

        <a-form layout="inline" class="roster-filter">
          <a-form-item>
            <a-input
              v-model:value="rosterKeyword"
              placeholder="按学号 / 姓名搜索"
              allow-clear
              class="roster-filter__keyword"
              @press-enter="handleRosterSearch"
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item>
            <a-select
              v-model:value="rosterClassFilter"
              placeholder="按班级筛选"
              allow-clear
              show-search
              option-filter-prop="label"
              class="roster-filter__class"
              :options="rosterClassFilterOptions"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <UiButton size="sm" @click="handleRosterSearch">查询</UiButton>
              <UiButton size="sm" variant="outline" @click="handleRosterReset">重置</UiButton>
            </a-space>
          </a-form-item>
        </a-form>

        <UiErrorRetryPanel
          v-if="tableLoadError"
          :error="tableLoadError"
          title="考生列表加载失败"
          compact
          @retry="loadCandidatePage"
        />
        <UiDataTable
          v-else
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :columns="columns"
          :data-source="tableCandidates"
          :loading="tableLoading"
          :total="pagination.total"
          row-key="rowKey"
          size="middle"
          flat
          class="roster-table"
          bordered
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'student'">
              <div class="roster-student">
                <span class="roster-student__name">{{ (record as CandidateRow).studentName }}</span>
                <span class="roster-student__no">{{ (record as CandidateRow).studentNo }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'className'">
              <span class="roster-cell roster-cell--muted">
                {{ (record as CandidateRow).className }}
              </span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton
                v-if="!classScopeReadOnly"
                size="sm"
                variant="ghost"
                :loading="removingStudentUserId === (record as CandidateRow).studentUserId"
                @click="removeCandidate((record as CandidateRow).studentUserId)"
              >
                移除
              </UiButton>
              <span v-else class="roster-cell roster-cell--muted">—</span>
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
    <BatchImportModal
      v-model:open="showImportModal"
      title="批量导入学生"
      entity-label="学生"
      :import-handler="handleImportStudents"
      :requirements="importRequirements"
      @download-template="handleDownloadImportTemplate"
      @success="handleImportSuccess"
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
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { CandidateRow } from './candidate-roster/types'
import type { ExamCandidateRosterRequest, ExamClassRefVO } from '@/apis/mark/exam'
import {
  getExamDetail,
  listExamCandidates,
  listExamClassOptions,
  mergeExamCandidates,
  pageExamCandidates,
  pageScannerBatches,
  previewExamCandidates,
  removeExamCandidates,
  saveExamClassScope,
} from '@/apis/mark/exam'
import type { UserDto } from '@/types/api-types.d'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { downloadUserImportTemplate, tenantBatchImportUsers } from '@/apis/edu/admin-user'
import BatchImportModal from '@/components/common/BatchImportModal.vue'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import StudentSelector from '@/components/quality/selectors/StudentSelector.vue'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { RoleEnum } from '@/types/enums'
import { ErrorType, handleError, showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { buildScopedClassTags, mergeClassSelectOptions } from './candidate-roster/class-scope'
import { toCandidateRow } from './candidate-roster/roster-merge'

defineOptions({ name: 'TeacherCandidateRoster' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const classIds = ref<string[]>([])
const examClassRefs = ref<ExamClassRefVO[]>([])
const classSelectOptions = ref<Array<{ label: string; value: string }>>([])
const classOptionsLoading = ref(false)
const classScopeHydrating = ref(false)
const lastSavedClassIds = ref<string[]>([])
const rosterLocked = ref(false)
const rosterWriteForbidden = ref(false)
const candidateTotal = ref(0)
let classScopeSaveTimer: ReturnType<typeof setTimeout> | null = null
let loadContextSeq = 0
let loadTableSeq = 0

const tableCandidates = ref<CandidateRow[]>([])
const rosterStudentUserIds = ref<string[]>([])
const contextLoading = ref(false)
const tableLoading = ref(false)
const rosterLoadError = ref<Error | null>(null)
const tableLoadError = ref<Error | null>(null)
const removingStudentUserId = ref<string | null>(null)
const singleAddSubmitting = ref(false)

const rosterKeyword = ref('')
const rosterClassFilter = ref<string | undefined>(undefined)
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
const singleAddClassId = ref<string | undefined>(undefined)
const singleAddStudentUserId = ref<string | null>(null)
const singleAddStudent = ref<UserDto | null>(null)

const classScopeReadOnly = computed(() => rosterLocked.value || rosterWriteForbidden.value)

const scopedClassTags = computed(() =>
  buildScopedClassTags(classIds.value, examClassRefs.value, classSelectOptions.value),
)

const rosterClassFilterOptions = computed(() =>
  scopedClassTags.value.map((item) => ({
    value: item.classId,
    label: item.className,
  })),
)

const importRequirements: string[] = [
  '请使用官方模板格式',
  '只保留姓名、学号、院系名称、班级名称四列',
  '学号不能重复；班级按院系名称匹配',
]

const columns: ColumnType<CandidateRow>[] = [
  { title: '考生', key: 'student', width: 220 },
  { title: '班级', key: 'className', width: 200 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
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

async function probeRosterLocked(examId: string): Promise<boolean> {
  const result = await pageScannerBatches({ examId, pageNum: 1, pageSize: 1 })
  return readPageTotal(result) > 0
}

async function loadClassOptionsForExam(examId: string): Promise<void> {
  classOptionsLoading.value = true
  try {
    const list = await listExamClassOptions(examId)
    classSelectOptions.value = mergeClassSelectOptions(
      examClassRefs.value,
      list.map((item) => ({
        label: item.className,
        value: item.classId,
      })),
    )
  } catch (error) {
    if (isPermissionError(error)) {
      rosterWriteForbidden.value = true
      classSelectOptions.value = mergeClassSelectOptions(examClassRefs.value, [])
      return
    }
    showUserError(error, '班级范围加载失败')
  } finally {
    classOptionsLoading.value = false
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
  tableLoadError.value = null
  try {
    const result = await pageExamCandidates({
      examId,
      keyword: rosterKeyword.value.trim() || undefined,
      classId: rosterClassFilter.value,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
    if (seq !== loadTableSeq) {
      return
    }
    tableCandidates.value = readPageList(result, '考生列表加载失败').map((item) =>
      toCandidateRow(
        {
          studentNo: item.studentNo,
          studentName: item.studentName,
          studentUserId: item.studentUserId,
          classId: item.classId ?? '',
          className: item.className,
        },
        item.candidateRosterId,
      ),
    )
    pagination.total = readPageTotal(result)
  } catch (error) {
    if (seq !== loadTableSeq) {
      return
    }
    tableLoadError.value = toUserError(error, '考生列表加载失败')
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
}

async function loadExamContext(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const examId = selectedExamId.value
  const seq = ++loadContextSeq
  contextLoading.value = true
  rosterLoadError.value = null
  rosterWriteForbidden.value = false
  classScopeHydrating.value = true
  try {
    const [detail, locked] = await Promise.all([getExamDetail(examId), probeRosterLocked(examId)])
    if (seq !== loadContextSeq) {
      return
    }
    rosterLocked.value = locked
    examClassRefs.value = [...(detail.classRefs ?? [])]
    candidateTotal.value = detail.candidateCount ?? 0
    classIds.value = [...(detail.classIds ?? [])]
    lastSavedClassIds.value = [...classIds.value]
    await loadClassOptionsForExam(examId)
    if (seq !== loadContextSeq) {
      return
    }
    classSelectOptions.value = mergeClassSelectOptions(
      examClassRefs.value,
      classSelectOptions.value,
    )
    await loadRosterStudentIds(examId)
  } catch (error) {
    if (seq !== loadContextSeq) {
      return
    }
    rosterLoadError.value = toUserError(error, '考生名册加载失败')
    showUserError(error, '考生名册加载失败')
  } finally {
    if (seq === loadContextSeq) {
      await nextTick()
      classScopeHydrating.value = false
      contextLoading.value = false
    }
  }
}

function handleRosterSearch(): void {
  pagination.current = 1
  void loadCandidatePage()
}

function handleRosterReset(): void {
  rosterKeyword.value = ''
  rosterClassFilter.value = undefined
  pagination.current = 1
  void loadCandidatePage()
}

function handlePageChange(pageInfo: { current: number; pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadCandidatePage()
}

function handleExamChange(
  value: SelectValue,
  option: DefaultOptionType | DefaultOptionType[],
): void {
  onExamChange(value, option)
}

function openSelectDrawer(): void {
  if (!classIds.value.length) {
    message.warning('请先选择班级范围')
    return
  }
  selectDrawerOpen.value = true
}

function openBatchImportModal(): void {
  showImportModal.value = true
}

async function handleImportStudents(file: File) {
  return await tenantBatchImportUsers(file, RoleEnum.SCH_STU)
}

function handleDownloadImportTemplate(): void {
  void downloadUserImportTemplate(RoleEnum.SCH_STU)
}

function handleImportSuccess(): void {
  message.success('学生已导入租户库，请从学生库勾选后纳入本次考试名册')
  if (classIds.value.length) {
    selectDrawerOpen.value = true
    return
  }
  message.warning('请先选择班级范围后再从学生库勾选')
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

function buildMergeRequest(
  rows: Array<{ id: string; classId?: string }>,
): ExamCandidateRosterRequest[] {
  const existing = new Set(rosterStudentUserIds.value)
  const request: ExamCandidateRosterRequest[] = []
  for (const row of rows) {
    const studentUserId = row.id.trim()
    const classId = String(row.classId ?? '').trim()
    if (!studentUserId || !classId || existing.has(studentUserId)) {
      continue
    }
    request.push({ studentUserId, classId })
  }
  return request
}

async function handleStudentsSelected(selection: {
  students: string[]
  studentsInfo: Array<{
    id: string
    name: string
    classId?: string
    className?: string
    studentNumber?: string
  }>
}): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  const mergeRequest = buildMergeRequest(selection.studentsInfo)
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
    await mergeCandidatesWithPreview([{ classId: singleAddClassId.value, studentUserId }])
    message.success('已加入名册')
    singleAddOpen.value = false
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '加入考生失败')
  } finally {
    singleAddSubmitting.value = false
  }
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
    void saveExamClassScope({
      examId: selectedExamId.value!,
      classIds: [...ids],
    })
      .then(async () => {
        lastSavedClassIds.value = [...ids]
        examClassRefs.value = ids.map((classId) => {
          const existing = examClassRefs.value.find((item) => item.classId === classId)
          const option = classSelectOptions.value.find((item) => item.value === classId)
          return {
            classId,
            className: existing?.className ?? option?.label ?? classId,
          }
        })
        classSelectOptions.value = mergeClassSelectOptions(
          examClassRefs.value,
          classSelectOptions.value,
        )
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

watch(selectedExamId, (value) => {
  if (classScopeSaveTimer) {
    clearTimeout(classScopeSaveTimer)
    classScopeSaveTimer = null
  }
  rosterLocked.value = false
  rosterWriteForbidden.value = false
  rosterKeyword.value = ''
  rosterClassFilter.value = undefined
  pagination.current = 1
  if (value) {
    void loadExamContext().then(() => loadCandidatePage())
  } else {
    classIds.value = []
    examClassRefs.value = []
    lastSavedClassIds.value = []
    tableCandidates.value = []
    rosterStudentUserIds.value = []
    classSelectOptions.value = []
    candidateTotal.value = 0
    pagination.total = 0
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadExamContext()
    await loadCandidatePage()
  }
})
</script>

<style lang="scss" scoped>
.roster-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__class-select {
    width: 100%;
  }
}

.roster-class-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  &__empty {
    font-size: 13px;
    color: var(--ant-color-text-secondary);
  }
}

.roster-filter {
  margin-bottom: 12px;

  &__keyword {
    width: 220px;
  }

  &__class {
    width: 200px;
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
