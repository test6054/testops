<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
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
        </template>
      </ContextBar>
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
          <span v-if="!scopedClassTags.length" class="roster-class-tags__empty">尚未配置班级范围</span>
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

      <a-card :bordered="false" class="detail-table-card info-card roster-page__table-card">
        <template #title>
          <UserOutlined />
          <span>考生名册</span>
        </template>
        <template v-if="!classScopeReadOnly" #extra>
          <a-space>
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
              批量导入
            </UiButton>
            <UiButton size="sm" @click="openSingleAddModal">
              <template #icon><PlusOutlined /></template>
              添加单个
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
          v-model="rosterFilterForm"
          :fields="rosterFilterFields"
          search-text="查询"
          @search="handleRosterSearch"
          @reset="handleRosterReset"
        />

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
          class="roster-table student-detail-table__data-table"
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
              <div class="operations-cell" @click.stop>
                <UiConfirmPopover
                  v-if="!classScopeReadOnly"
                  title="确认移除该考生？"
                  description="移除后需重新加入名册。"
                  danger
                  @confirm="removeCandidate((record as CandidateRow).studentUserId)"
                >
                  <UiTextAction tone="danger">移除</UiTextAction>
                </UiConfirmPopover>
                <span v-else class="muted">—</span>
              </div>
            </template>
          </template>
        </UiDataTable>
      </a-card>
    </a-spin>

    <ClassStudentTreeSelectorDrawer
      v-model="selectDrawerOpen"
      title="选择考试考生"
      :exam-id="selectedExamId ?? undefined"
      :allowed-class-ids="classIds"
      :excluded-student-ids="rosterStudentUserIds"
      @confirm="handleStudentsSelected"
    />
    <a-modal
      v-model:open="showImportModal"
      title="导入考生名册"
      ok-text="导入名册"
      :ok-button-props="{ disabled: !importPreview || importPreview.errorCount > 0 || importPreview.validCount === 0 }"
      :confirm-loading="importCommitting"
      :destroy-on-close="true"
      width="920px"
      @ok="handleCommitImport"
      @cancel="resetImportModal"
    >
      <div class="roster-import">
        <div class="roster-import__toolbar">
          <a-upload
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            :show-upload-list="false"
            :before-upload="handleImportFileSelected"
          >
            <UiButton size="sm" variant="outline">
              <template #icon><UploadOutlined /></template>
              选择文件
            </UiButton>
          </a-upload>
          <UiButton size="sm" :loading="importPreviewing" :disabled="!canPreviewImport" @click="handlePreviewImport">
            重新预览
          </UiButton>
          <UiTag v-if="importFileName" tone="blue" size="sm">{{ importFileName }}</UiTag>
          <UiTag v-if="importDataRowCount > 0" tone="gray" size="sm">{{ importDataRowCount }} 行数据</UiTag>
          <UiTag v-if="importPreview" :tone="importPreview.errorCount > 0 ? 'red' : 'green'" size="sm">
            {{ importPreview.validCount }} 可导入 / {{ importPreview.errorCount }} 错误
          </UiTag>
        </div>
        <a-alert
          v-if="importValidationMessage"
          :message="importValidationMessage"
          type="warning"
          show-icon
          class="roster-import__alert"
        />
        <div v-if="importColumnOptions.length" class="roster-import__mapping">
          <a-form layout="vertical" class="roster-import__mapping-form">
            <a-form-item label="院系">
              <a-select
                v-model:value="importFieldMapping.departmentName"
                :options="optionalImportColumnOptions"
                placeholder="可不选择"
                allow-clear
              />
            </a-form-item>
            <a-form-item label="班级" required>
              <a-select
                v-model:value="importFieldMapping.className"
                :options="importColumnOptions"
                placeholder="选择班级列"
              />
            </a-form-item>
            <a-form-item label="学号" required>
              <a-select
                v-model:value="importFieldMapping.studentNo"
                :options="importColumnOptions"
                placeholder="选择学号列"
              />
            </a-form-item>
            <a-form-item label="姓名" required>
              <a-select
                v-model:value="importFieldMapping.studentName"
                :options="importColumnOptions"
                placeholder="选择姓名列"
              />
            </a-form-item>
          </a-form>
          <div class="roster-import__preview">
            <div class="roster-import__preview-title">文件前 5 行</div>
            <div class="roster-import__preview-grid">
              <div
                v-for="option in importColumnOptions"
                :key="option.value"
                class="roster-import__preview-head"
              >
                {{ option.label }}
              </div>
              <template v-for="row in importPreviewSampleRows" :key="row.rowNo">
                <div
                  v-for="cell in row.cells"
                  :key="`${row.rowNo}-${cell.columnIndex}`"
                  class="roster-import__preview-cell"
                >
                  {{ cell.text || '—' }}
                </div>
              </template>
            </div>
          </div>
        </div>
        <UiDataTable
          v-if="importPreview"
          :columns="importColumns"
          :data-source="importPreviewPagedRows"
          v-model:current="importPreviewPage"
          v-model:page-size="importPreviewPageSize"
          :total="importPreview.rows.length"
          :show-size-changer="false"
          row-key="rowNo"
          size="small"
          flat
          class="roster-import__table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'student'">
              <div class="roster-student">
                <span class="roster-student__name">
                  {{ (record as ExamCandidateImportRowResponse).resolvedStudentName || (record as ExamCandidateImportRowResponse).studentName }}
                </span>
                <span class="roster-student__no">
                  {{ (record as ExamCandidateImportRowResponse).resolvedStudentNo || (record as ExamCandidateImportRowResponse).studentNo }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'className'">
              <span>{{ (record as ExamCandidateImportRowResponse).resolvedClassName || (record as ExamCandidateImportRowResponse).className }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <UiTag
                v-if="(record as ExamCandidateImportRowResponse).valid"
                :tone="(record as ExamCandidateImportRowResponse).importAction === 'CREATE_STUDENT' ? 'orange' : 'blue'"
                size="sm"
              >
                {{ (record as ExamCandidateImportRowResponse).importAction === 'CREATE_STUDENT' ? '将创建学生用户' : '复用学生用户' }}
              </UiTag>
              <UiTag v-else tone="red" size="sm">不可导入</UiTag>
            </template>
            <template v-else-if="column.key === 'message'">
              <span :class="{ 'roster-import__error': !(record as ExamCandidateImportRowResponse).valid }">
                {{ (record as ExamCandidateImportRowResponse).errorMessage || '可导入' }}
              </span>
            </template>
          </template>
        </UiDataTable>
      </div>
    </a-modal>

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
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type { CandidateRow } from './candidate-roster/types'
import type {
  ExamCandidateImportPreviewResponse,
  ExamCandidateImportRowRequest,
  ExamCandidateImportRowResponse,
  ExamCandidateRosterRequest,
  ExamClassRefVO,
} from '@/apis/mark/exam'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { UserDto } from '@/types/api-types.d'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UploadOutlined from '@ant-design/icons-vue/UploadOutlined'
import UserAddOutlined from '@ant-design/icons-vue/UserAddOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import Modal from 'ant-design-vue/es/modal'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import {
  commitExamCandidateImport,
  getExamDetail,
  listExamCandidates,
  listExamClassOptions,
  mergeExamCandidates,
  pageExamCandidates,
  pageScannerBatches,
  previewExamCandidateImport,
  previewExamCandidates,
  removeExamCandidates,
  saveExamClassScope,
  saveExamScope,
} from '@/apis/mark/exam'
import ClassStudentTreeSelectorDrawer from '@/components/edu/ClassStudentTreeSelectorDrawer.vue'
import StudentSelector from '@/components/quality/selectors/StudentSelector.vue'
import {
  UiAlertStrip,
  UiButton,
  UiCard,
  UiConfirmPopover,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiFilterBar,
  UiTag,
  UiTextAction,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { ErrorType, handleError, showUserError, toUserError } from '@/utils/error-handler'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { buildScopedClassTags, mergeClassSelectOptions } from './candidate-roster/class-scope'
import { toCandidateRow } from './candidate-roster/roster-merge'

defineOptions({ name: 'TeacherCandidateRoster' })

const ROSTER_CANDIDATE_EXPORT_PAGE_SIZE = 100

type ImportFieldKey = 'departmentName' | 'className' | 'studentNo' | 'studentName'

interface ImportColumnOption {
  label: string
  value: number
}

interface ImportFieldMapping {
  departmentName?: number
  className?: number
  studentNo?: number
  studentName?: number
}

interface ImportSheetRow {
  rowNo: number
  cells: string[]
}

interface ImportPreviewSampleRow {
  rowNo: number
  cells: Array<{
    columnIndex: number
    text: string
  }>
}

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
const classSelectOptions = ref<Array<{ label: string, value: string }>>([])
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
const fullScopeSaving = ref(false)
const tableLoading = ref(false)
const rosterLoadError = ref<Error | null>(null)
const tableLoadError = ref<Error | null>(null)
const removingStudentUserId = ref<string | null>(null)
const singleAddSubmitting = ref(false)

const rosterFilterForm = reactive<{
  keyword: string
  classId?: string
}>({
  keyword: '',
  classId: undefined,
})

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const selectDrawerOpen = ref(false)
const showImportModal = ref(false)
const importFileName = ref('')
const importSheetRows = ref<ImportSheetRow[]>([])
const importFieldMapping = reactive<ImportFieldMapping>({})
const importRows = ref<ExamCandidateImportRowRequest[]>([])
const importPreview = ref<ExamCandidateImportPreviewResponse | null>(null)
const importPreviewing = ref(false)
const importPreviewPage = ref(1)
const importPreviewPageSize = ref(8)
const importCommitting = ref(false)
let importPreviewTimer: ReturnType<typeof setTimeout> | null = null
let importPreviewSeq = 0
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

const columns: ColumnType<CandidateRow>[] = [
  { title: '考生', key: 'student', width: 220 },
  { title: '班级', key: 'className', width: 200 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

const importColumns: ColumnType<ExamCandidateImportRowResponse>[] = [
  { title: '行号', dataIndex: 'rowNo', key: 'rowNo', width: 72 },
  { title: '班级', key: 'className', width: 180 },
  { title: '考生', key: 'student', width: 180 },
  { title: '导入动作', key: 'action', width: 150 },
  { title: '诊断', key: 'message' },
]

const importColumnOptions = computed<ImportColumnOption[]>(() => {
  const maxColumnCount = importSheetRows.value.reduce(
    (max, row) => Math.max(max, row.cells.length),
    0,
  )
  if (maxColumnCount === 0) {
    return []
  }
  const headerRow = importSheetRows.value[0]
  return Array.from({ length: maxColumnCount }, (_, index) => {
    const headerText = String(headerRow?.cells[index] ?? '').trim()
    return {
      value: index,
      label: headerText || `第 ${index + 1} 列`,
    }
  })
})

const optionalImportColumnOptions = computed<ImportColumnOption[]>(() => [
  { value: -1, label: '不导入院系' },
  ...importColumnOptions.value,
])

const importDataRows = computed<ImportSheetRow[]>(() => importSheetRows.value.slice(1))

const importDataRowCount = computed(() =>
  importDataRows.value.filter((row) => row.cells.some((cell) => cell.trim())).length,
)

const importPreviewSampleRows = computed<ImportPreviewSampleRow[]>(() =>
  importDataRows.value.slice(0, 5).map((row) => ({
    rowNo: row.rowNo,
    cells: importColumnOptions.value.map((option) => ({
      columnIndex: option.value,
      text: String(row.cells[option.value] ?? '').trim(),
    })),
  })),
)

const importPreviewPagedRows = computed(() => {
  if (!importPreview.value) return []
  const start = (importPreviewPage.value - 1) * importPreviewPageSize.value
  return importPreview.value.rows.slice(start, start + importPreviewPageSize.value)
})

const canPreviewImport = computed(() =>
  Boolean(
    selectedExamId.value
    && importDataRowCount.value > 0
    && importFieldMapping.className !== undefined
    && importFieldMapping.studentNo !== undefined
    && importFieldMapping.studentName !== undefined,
  ),
)

const importValidationMessage = computed(() => {
  if (!importFileName.value) {
    return '请上传 Excel、CSV、TSV 或 TXT 格式的考生名册文件。'
  }
  if (!importColumnOptions.value.length) {
    return '文件中没有可识别的列。'
  }
  if (importDataRowCount.value === 0) {
    return '文件中没有可导入的数据行。'
  }
  const missingFields: string[] = []
  if (importFieldMapping.className === undefined) {
    missingFields.push('班级')
  }
  if (importFieldMapping.studentNo === undefined) {
    missingFields.push('学号')
  }
  if (importFieldMapping.studentName === undefined) {
    missingFields.push('姓名')
  }
  if (missingFields.length) {
    return `请完成字段映射：${missingFields.join('、')}`
  }
  return ''
})

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
      keyword: rosterFilterForm.keyword.trim() || undefined,
      classId: rosterFilterForm.classId,
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
  pagination.current = 1
  void loadCandidatePage()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
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

function openImportModal(): void {
  resetImportModal()
  showImportModal.value = true
}

function resetImportModal(): void {
  if (importPreviewTimer) {
    clearTimeout(importPreviewTimer)
    importPreviewTimer = null
  }
  importFileName.value = ''
  importSheetRows.value = []
  importFieldMapping.departmentName = undefined
  importFieldMapping.className = undefined
  importFieldMapping.studentNo = undefined
  importFieldMapping.studentName = undefined
  importRows.value = []
  importPreview.value = null
}

function inferImportFieldMapping(rows: ImportSheetRow[]): void {
  const headerCells = rows[0]?.cells ?? []
  const patterns: Record<ImportFieldKey, string[]> = {
    departmentName: ['院系', '院系名称', '学院', '学院名称'],
    className: ['班级', '班级名称', '行政班'],
    studentNo: ['学号', '学生学号', '考号', '学生编号'],
    studentName: ['姓名', '学生姓名', '考生姓名'],
  }
  ;(Object.keys(patterns) as ImportFieldKey[]).forEach((field) => {
    const matchedIndex = headerCells.findIndex((cell) => patterns[field].includes(cell.trim()))
    importFieldMapping[field] = matchedIndex >= 0 ? matchedIndex : undefined
  })
}

function readWorkbookRows(workbook: XLSX.WorkBook): ImportSheetRow[] {
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return []
  }
  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  })
  return rows.map((cells, index) => ({
    rowNo: index + 1,
    cells: cells.map((cell) => String(cell ?? '').trim()),
  }))
}

function applyImportedWorkbook(fileName: string, workbook: XLSX.WorkBook): void {
  const rows = readWorkbookRows(workbook)
  if (!rows.length) {
    message.warning('文件中没有可识别的名册数据')
    resetImportModal()
    showImportModal.value = true
    importFileName.value = fileName
    return
  }
  importFileName.value = fileName
  importSheetRows.value = rows
  importPreview.value = null
  importRows.value = []
  inferImportFieldMapping(rows)
}

function handleImportFileSelected(file: File): boolean {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const result = reader.result
      const workbook = result instanceof ArrayBuffer
        ? XLSX.read(result, { type: 'array' })
        : XLSX.read(String(result ?? ''), { type: 'string' })
      applyImportedWorkbook(file.name, workbook)
    } catch (error) {
      showUserError(error, '名册文件解析失败')
    }
  }
  reader.onerror = () => {
    message.error('名册文件读取失败')
  }
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    reader.readAsArrayBuffer(file)
  } else {
    reader.readAsText(file)
  }
  return false
}

function buildImportRowsFromMapping(): ExamCandidateImportRowRequest[] {
  if (
    importFieldMapping.className === undefined
    || importFieldMapping.studentNo === undefined
    || importFieldMapping.studentName === undefined
  ) {
    return []
  }
  const rows: ExamCandidateImportRowRequest[] = []
  importDataRows.value.forEach((row) => {
    const departmentColumn = importFieldMapping.departmentName
    const departmentName = departmentColumn === undefined || departmentColumn < 0
      ? undefined
      : String(row.cells[departmentColumn] ?? '').trim()
    const className = String(row.cells[importFieldMapping.className!] ?? '').trim()
    const studentNo = String(row.cells[importFieldMapping.studentNo!] ?? '').trim()
    const studentName = String(row.cells[importFieldMapping.studentName!] ?? '').trim()
    if (!className && !studentNo && !studentName) {
      return
    }
    rows.push({
      rowNo: row.rowNo,
      departmentName: departmentName || undefined,
      className,
      studentNo,
      studentName,
    })
  })
  return rows
}

async function handlePreviewImport(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  if (importValidationMessage.value) {
    message.warning(importValidationMessage.value)
    return
  }
  const rows = buildImportRowsFromMapping()
  if (!rows.length) {
    message.warning('文件中没有可导入的班级、学号、姓名数据')
    return
  }
  const seq = ++importPreviewSeq
  importRows.value = rows
  importPreviewing.value = true
  try {
    const response = await previewExamCandidateImport({
      examId: selectedExamId.value,
      classIds: [...classIds.value],
      rows,
    })
    if (seq !== importPreviewSeq) {
      return
    }
    importPreview.value = response
  } catch (error) {
    if (seq === importPreviewSeq) {
      showUserError(error, '导入预览失败')
    }
  } finally {
    if (seq === importPreviewSeq) {
      importPreviewing.value = false
    }
  }
}

async function handleCommitImport(): Promise<void> {
  if (!selectedExamId.value || !importPreview.value) {
    return
  }
  const rows = buildImportRowsFromMapping()
  if (!rows.length) {
    message.warning('文件中没有可导入的班级、学号、姓名数据')
    return
  }
  importRows.value = rows
  importCommitting.value = true
  try {
    const response = await commitExamCandidateImport({
      examId: selectedExamId.value,
      classIds: [...classIds.value],
      rows,
    })
    importPreview.value = response
    if (response.errorCount > 0) {
      message.error('名册存在错误行，未写入')
      return
    }
    message.success('名册已导入，缺失学生已创建')
    showImportModal.value = false
    resetImportModal()
    await reloadExamContext()
  } catch (error) {
    showUserError(error, '导入考生名册失败')
  } finally {
    importCommitting.value = false
  }
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
    (pageNum) => pageExamCandidates({
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

function confirmSaveFullScope(): void {
  if (!selectedExamId.value || !classIds.value.length) {
    message.warning('请先选择班级范围')
    return
  }
  Modal.confirm({
    title: '全量保存考生名册？',
    content: '将当前班级范围与全部考生一次性写入后端，覆盖增量编辑结果。扫描已开始后可能失败。',
    okText: '全量保存',
    cancelText: '取消',
    async onOk() {
      fullScopeSaving.value = true
      try {
        const candidates = await fetchAllRosterCandidates()
        if (!candidates.length) {
          message.error('名册为空，无法全量保存')
          return
        }
        await saveExamScope({
          examId: selectedExamId.value!,
          classIds: [...classIds.value],
          candidates,
        })
        message.success(`已全量保存 ${candidates.length} 名考生`)
        await reloadExamContext()
      } catch (error) {
        showUserError(error, '全量保存名册失败')
      } finally {
        fullScopeSaving.value = false
      }
    },
  })
}

function buildMergeRequest(
  rows: Array<{ id: string, classId?: string }>,
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

watch(
  [
    () => importFieldMapping.departmentName,
    () => importFieldMapping.className,
    () => importFieldMapping.studentNo,
    () => importFieldMapping.studentName,
    () => importSheetRows.value,
  ],
  () => {
    importPreview.value = null
    importRows.value = []
    if (importPreviewTimer) {
      clearTimeout(importPreviewTimer)
      importPreviewTimer = null
    }
    if (!canPreviewImport.value) {
      return
    }
    importPreviewTimer = setTimeout(() => {
      importPreviewTimer = null
      void handlePreviewImport()
    }, 500)
  },
)

watch(selectedExamId, (value) => {
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

.roster-import {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2, 8px);
  }

  &__alert {
    margin: 0;
  }

  &__mapping {
    display: grid;
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
    gap: var(--dp-space-4, 16px);
    padding: var(--dp-space-4, 16px);
    border: 1px solid var(--dp-border, var(--ant-color-border));
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--dp-surface-subtle, var(--ant-color-fill-quaternary));
  }

  &__mapping-form {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dp-space-2, 8px);

    :deep(.ant-form-item) {
      margin-bottom: 0;
    }
  }

  &__preview {
    min-width: 0;
    overflow: hidden;
  }

  &__preview-title {
    margin-bottom: var(--dp-space-2, 8px);
    font-size: 13px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  &__preview-grid {
    display: grid;
    grid-auto-rows: minmax(32px, auto);
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    overflow: auto;
    border: 1px solid var(--dp-border, var(--ant-color-border));
    border-radius: var(--dp-radius-control, 8px);
    background: var(--ant-color-bg-container);
  }

  &__preview-head,
  &__preview-cell {
    min-width: 0;
    padding: 7px 10px;
    overflow: hidden;
    font-size: 13px;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-right: 1px solid var(--dp-border, var(--ant-color-border));
    border-bottom: 1px solid var(--dp-border, var(--ant-color-border));
  }

  &__preview-head {
    font-weight: 600;
    color: var(--ant-color-text);
    background: var(--ant-color-fill-quaternary);
  }

  &__preview-cell {
    color: var(--ant-color-text-secondary);
  }

  &__table {
    :deep(.ant-table-thead > tr > th) {
      background: var(--dp-surface-subtle, var(--ant-color-fill-quaternary));
      font-weight: 600;
    }
  }

  &__error {
    color: var(--ant-color-error);
  }
}

@media (max-width: 900px) {
  .roster-import {
    &__mapping {
      grid-template-columns: 1fr;
    }
  }
}
</style>
