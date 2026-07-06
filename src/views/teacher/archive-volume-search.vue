<template>
  <StageWorkbenchShell class="archive-search-page">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="材料检索"
        subtitle="跨卷 OCR 全文检索 · 归档材料内容"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <WorkbenchSurfaceCard flush>
      <template #toolbar>
        <div class="archive-search-toolbar">
          <div class="archive-search-toolbar__profiles">
            <a-select
              v-model:value="selectedProfileId"
              allow-clear
              class="archive-search-toolbar__profile-select"
              :loading="profilesLoading"
              placeholder="已保存检索"
              :options="profileOptions"
            />
            <UiButton variant="outline" size="sm" :disabled="!selectedProfileId" @click="applySelectedProfile">
              加载
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              :disabled="!selectedOwnedProfile"
              @click="openSaveProfileModal('update')"
            >
              更新方案
            </UiButton>
            <UiButton variant="outline" size="sm" @click="openSaveProfileModal('saveAs')">
              另存为
            </UiButton>
            <UiButton
              variant="ghost"
              size="sm"
              :disabled="!selectedOwnedProfile"
              @click="handleDeleteProfile"
            >
              删除
            </UiButton>
          </div>
          <div class="archive-search-primary">
            <div class="archive-search-primary__field archive-search-primary__field--keyword">
              <label class="archive-search-primary__label">OCR 关键词</label>
              <a-input
                v-model:value="filterForm.keyword"
                allow-clear
                placeholder="输入关键词搜索归档材料 OCR 全文..."
                @press-enter="handleSearch"
              />
            </div>
            <div class="archive-search-primary__field">
              <label class="archive-search-primary__label">考试</label>
              <MarkExamSelect
                :selected-exam-id="filterForm.examId"
                :exam-options="examOptions"
                :loading="examLoading"
                :searching="examSearching"
                select-class="archive-search-primary__exam-select"
                placeholder="全部考试"
                @change="handleExamChange"
                @search="handleExamSearch"
              />
            </div>
            <div class="archive-search-primary__field">
              <label class="archive-search-primary__label">学院</label>
              <a-select
                v-model:value="filterForm.departmentId"
                allow-clear
                class="archive-search-primary__select"
                :options="departmentOptions"
                placeholder="全部学院"
              />
            </div>
            <div class="archive-search-primary__field">
              <label class="archive-search-primary__label">课程</label>
              <a-select
                v-model:value="filterForm.courseId"
                allow-clear
                class="archive-search-primary__select"
                :options="courseOptions"
                placeholder="全部课程"
              />
            </div>
            <UiButton variant="primary" size="sm" class="archive-search-primary__submit" @click="handleSearch">
              检索
            </UiButton>
          </div>
          <UiFilterBar
            v-model="filterModel"
            :fields="filterFields"
            variant="panel"
            show-labels
            search-text="检索"
            @search="handleSearch"
            @reset="handleReset"
          />
          <div class="archive-search-toolbar__examples">
            <span class="archive-search-toolbar__examples-label">示例:</span>
            <UiTextAction
              v-for="keyword in SEARCH_EXAMPLES"
              :key="keyword"
              @click="applySearchExample(keyword)"
            >
              {{ keyword }}
            </UiTextAction>
          </div>
        </div>
      </template>

      <p v-if="pagination.total > 0" class="archive-search-result-meta">
        {{ pagination.total }} 条匹配<span v-if="resultMetaVolumeHint">{{ resultMetaVolumeHint }}</span>
      </p>

      <UiDataTable
        v-model:current="pagination.pageNum"
        v-model:page-size="pagination.pageSize"
        :columns="columns"
        :data-source="hits"
        :loading="loading"
        :total="pagination.total"
        flat
        row-key="materialId"
        size="middle"
        empty-kind="first-run"
        empty-description="填写学号、档案号、目录编码或 OCR 关键词开始检索"
        class="student-detail-table__data-table"
        @page-change="loadHits"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'archive'">
            <button type="button" class="link-cell" @click="goDetail(record.volumeId)">
              {{ record.archiveNo }}
            </button>
            <div class="link-cell__sub">{{ record.archiveTitle }}</div>
          </template>
          <template v-else-if="column.key === 'materialType'">
            {{ materialTypeLabel(record.materialType) }}
          </template>
          <template v-else-if="column.key === 'ocrStatus'">
            <UiTag
              v-if="record.ocrStatus"
              :tone="materialOcrStatusTone(record.ocrStatus)"
              size="sm"
            >
              {{ materialOcrStatusLabel(record.ocrStatus) }}
            </UiTag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'catalog'">
            <div>{{ record.catalogCode || '-' }}</div>
            <div v-if="record.catalogName" class="link-cell__sub">{{ record.catalogName }}</div>
          </template>
          <template v-else-if="column.key === 'tags'">
            <template v-if="record.tags?.length">
              <UiTag v-for="tag in record.tags" :key="tag" tone="gray" size="sm">{{ tag }}</UiTag>
            </template>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'term'">
            {{ formatTerm(record.academicYear, record.semester) }}
          </template>
          <template v-else-if="column.key === 'snippet'">
            <div class="archive-search-snippet-row">
              <div
                v-if="record.snippet && filterForm.keyword.trim()"
                class="archive-search-snippet-block"
                v-html="highlightSnippet(record.snippet)"
              />
              <span
                v-else-if="record.snippet"
                class="archive-search-snippet-block archive-search-snippet-block--plain"
              >
                {{ record.snippet }}
              </span>
              <span v-else>—</span>
              <div v-if="record.matchPageNo" class="archive-search-snippet-meta">
                <span class="archive-search-page-no">P{{ record.matchPageNo }}</span>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction tone="primary" @click="goDetail(record.volumeId)">查看卷</UiTextAction>
            <UiTextAction tone="primary" @click="goDetailOcrSearch(record.volumeId)">
              跳转检索 Tab
            </UiTextAction>
            <UiTextAction
              v-if="canViewMaterialOcr(record)"
              tone="primary"
              @click="openMaterialOcrPreview(record)"
            >
              {{ record.matchPageNo ? `预览第 ${record.matchPageNo} 页` : '预览原文' }}
            </UiTextAction>
            <UiTextAction
              v-if="canViewMaterialOcr(record)"
              tone="primary"
              @click="openMaterialOcr(record)"
            >
              查看 OCR
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard v-if="ocrInlineMaterialId" flush class="archive-search-ocr-panel">
      <template #head>
        <div class="archive-search-ocr-panel__head">
          <span class="archive-search-ocr-panel__title">OCR 文档详情</span>
          <span v-if="ocrInlineFileName" class="archive-search-ocr-panel__file">{{ ocrInlineFileName }}</span>
          <UiButton variant="ghost" size="sm" @click="closeOcrInlinePanel">关闭</UiButton>
        </div>
      </template>
      <ArchiveVolumeMaterialOcrDetailContent
        :material-id="ocrInlineMaterialId"
        :initial-page-no="ocrInlinePageNo"
      />
    </WorkbenchSurfaceCard>

    <ArchiveVolumeMaterialOcrDetailModal
      v-model:open="ocrDetailOpen"
      :material-id="ocrDetailMaterialId"
      :initial-page-no="ocrDetailInitialPageNo"
    />

    <UiDrawer
      v-model:open="saveProfileModalOpen"
      :title="saveProfileMode === 'update' ? '更新检索方案' : '另存为检索方案'"
      ok-text="保存"
      cancel-text="取消"
      :width="520"
      :hide-footer="false"
      :confirm-loading="saveProfileLoading"
      @ok="handleSaveProfile"
    >
      <a-form layout="vertical">
        <a-form-item label="方案名称" required>
          <a-input v-model:value="saveProfileForm.profileName" :maxlength="128" placeholder="如：2024 秋季期末卷检索" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="saveProfileForm.sharedFlag">租户内共享</a-checkbox>
        </a-form-item>
      </a-form>
    </UiDrawer>

    <ArchiveVolumeListNextStepsPanel variant="search" />
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialOcrStatusCode } from '@/apis/mark/archive-ocr-status'
import type {
  ArchiveMaterialTypeCode,
  ArchiveVolumeMaterialSearchCriteria,
  ArchiveVolumeMaterialSearchProfileResponse,
  ArchiveVolumeSearchRequest,
  ArchiveVolumeSearchResponse,
} from '@/apis/mark/archive-volume'
import type { CourseListVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import type { MarkExamSelectOption } from '@/utils/mark-exam-option'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ARCHIVE_MATERIAL_OCR_STATUS_OPTIONS,
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  ArchiveMaterialOcrStatusDescription,
} from '@/apis/mark/archive-ocr-status'
import {
  ARCHIVE_MATERIAL_TYPE_OPTIONS,
  ArchiveMaterialTypeDescription,
  deleteArchiveVolumeSearchProfile,
  listArchiveVolumeSearchProfiles,
  saveArchiveVolumeSearchProfile,
  searchArchiveVolumes,
} from '@/apis/mark/archive-volume'
import { ExamStatusCode, getExamDetail, pageExams } from '@/apis/mark/exam'
import { courseCatalogApi, departmentCatalogApi } from '@/apis/quality/user-catalog'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { generateAcademicYearOptions } from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { highlightArchiveSearchSnippet } from '@/utils/archive-search-snippet'
import { showUserError } from '@/utils/error-handler'
import { examSummaryFromDetail, toMarkExamSelectOption } from '@/utils/mark-exam-option'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeListNextStepsPanel from '@/views/teacher/archive-volume/components/ArchiveVolumeListNextStepsPanel.vue'
import ArchiveVolumeMaterialOcrDetailContent from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailContent.vue'
import ArchiveVolumeMaterialOcrDetailModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue'

defineOptions({ name: 'TeacherArchiveVolumeSearch' })

const SEARCH_EXAMPLES: string[] = ['水准测量', '混凝土保护层', 'NPV净现值']

interface SearchFilterForm {
  keyword: string
  studentNo: string
  studentNameKeyword: string
  archiveKeyword: string
  catalogCode: string
  catalogNameKeyword: string
  tagAnyKeyword: string
  fileNameKeyword: string
  classNameKeyword: string
  departmentId?: string
  courseId?: string
  volumeId?: string
  examId?: string
  ocrStatus?: ArchiveMaterialOcrStatusCode
  materialType?: ArchiveMaterialTypeCode
  academicYear?: string
  semester?: SemesterCode
}

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const profilesLoading = ref(false)
const saveProfileLoading = ref(false)
const saveProfileModalOpen = ref(false)
const saveProfileMode = ref<'update' | 'saveAs'>('saveAs')
const ocrDetailOpen = ref(false)
const ocrDetailMaterialId = ref<string>()
const ocrDetailInitialPageNo = ref<number>()
const ocrInlineMaterialId = ref<string>()
const ocrInlinePageNo = ref<number>()
const ocrInlineFileName = ref<string>()
const hits = ref<ArchiveVolumeSearchResponse[]>([])
const departmentOptions = ref<Array<{ value: string, label: string }>>([])
const courseOptions = ref<Array<{ value: string, label: string }>>([])
const examOptions = ref<MarkExamSelectOption[]>([])
const examLoading = ref(false)
const examSearching = ref(false)
const searchProfiles = ref<ArchiveVolumeMaterialSearchProfileResponse[]>([])
const selectedProfileId = ref<string>()
const saveProfileForm = reactive({
  profileName: '',
  sharedFlag: false,
})
const filterForm = reactive<SearchFilterForm>({
  keyword: '',
  studentNo: '',
  studentNameKeyword: '',
  archiveKeyword: '',
  catalogCode: '',
  catalogNameKeyword: '',
  tagAnyKeyword: '',
  fileNameKeyword: '',
  classNameKeyword: '',
})
const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})
const pagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const signalMetrics = computed<SignalMetric[]>(() => {
  if (pagination.total <= 0) {
    return []
  }
  const metrics: SignalMetric[] = [
    { key: 'hits', label: '命中材料', value: pagination.total, unit: '条', tone: 'green' },
  ]
  if (matchedVolumeCount.value > 0) {
    metrics.push({
      key: 'volumes',
      label: filterForm.volumeId ? '限定卷数' : '涉及归档卷',
      value: matchedVolumeCount.value,
      unit: '卷',
      tone: 'blue',
    })
  }
  return metrics
})

const matchedVolumeCount = computed(() =>
  new Set(hits.value.map((item) => item.volumeId).filter(Boolean)).size,
)

const resultMetaVolumeHint = computed(() => {
  if (filterForm.volumeId) {
    return matchedVolumeCount.value > 0 ? ` · 限定 ${matchedVolumeCount.value} 卷` : ''
  }
  if (pagination.total <= 0 || matchedVolumeCount.value <= 0) {
    return ''
  }
  if (pagination.total <= pagination.pageSize) {
    return ` · 跨 ${matchedVolumeCount.value} 个归档卷`
  }
  return ` · 当前页 ${matchedVolumeCount.value} 卷`
})

const profileOptions = computed(() =>
  searchProfiles.value.map((profile) => ({
    value: profile.profileId,
    label: profile.sharedFlag
      ? `${profile.profileName}（共享）`
      : profile.profileName,
  })),
)

const selectedOwnedProfile = computed(() => {
  if (!selectedProfileId.value) return false
  const profile = searchProfiles.value.find((item) => item.profileId === selectedProfileId.value)
  return Boolean(profile?.ownedByCurrentUser)
})

const materialTypeOptions = ARCHIVE_MATERIAL_TYPE_OPTIONS

const filterFields = computed<FilterField[]>(() => [
  { key: 'studentNo', label: '学号', type: 'input', placeholder: '精确匹配' },
  { key: 'studentNameKeyword', label: '姓名', type: 'input', placeholder: '模糊匹配' },
  { key: 'archiveKeyword', label: '档案号/标题', type: 'input', placeholder: '模糊匹配' },
  { key: 'catalogCode', label: '目录编码', type: 'input', placeholder: '精确匹配' },
  { key: 'catalogNameKeyword', label: '目录名称', type: 'input', placeholder: '模糊匹配' },
  { key: 'tagAnyKeyword', label: '材料标签', type: 'input', placeholder: '精确匹配，多个用逗号分隔（「期末」不匹配「期末补录」）' },
  { key: 'classNameKeyword', label: '班级', type: 'input', placeholder: '模糊匹配' },
  { key: 'fileNameKeyword', label: '文件名', type: 'input', placeholder: '模糊匹配' },
  {
    key: 'academicYear',
    label: '学年',
    type: 'select',
    placeholder: '全部学年',
    options: generateAcademicYearOptions().map((year: string) => ({ label: year, value: year })),
    allowClear: true,
  },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '全部学期',
    options: SemesterOptions.map((item) => ({ label: formatSemester(item.value), value: item.value })),
    allowClear: true,
  },
  {
    key: 'ocrStatus',
    label: 'OCR 状态',
    type: 'select',
    placeholder: '全部状态',
    options: ARCHIVE_MATERIAL_OCR_STATUS_OPTIONS.map((item) => ({
      label: item.label,
      value: item.value,
    })),
    allowClear: true,
  },
  {
    key: 'materialType',
    label: '材料类型',
    type: 'select',
    placeholder: '全部类型',
    options: materialTypeOptions,
    allowClear: true,
  },
])

const columns: ColumnsType<ArchiveVolumeSearchResponse> = [
  { title: '归档卷', key: 'archive', dataIndex: 'archiveNo', width: 200 },
  { title: '学年学期', key: 'term', width: 140 },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '姓名', dataIndex: 'studentName', width: 100 },
  { title: '目录', key: 'catalog', width: 130 },
  { title: '标签', key: 'tags', width: 140 },
  { title: '文件名', dataIndex: 'fileName', width: 160 },
  { title: '班级', dataIndex: 'className', width: 110 },
  { title: '材料类型', key: 'materialType', width: 130 },
  { title: 'OCR 状态', key: 'ocrStatus', width: 110 },
  { title: '命中摘要', key: 'snippet', dataIndex: 'snippet' },
  { title: '操作', key: 'actions', width: 220 },
]

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function materialOcrStatusLabel(code: ArchiveMaterialOcrStatusCode) {
  return strictEnumLabel(ArchiveMaterialOcrStatusDescription, code, 'ocrStatus')
}

function materialOcrStatusTone(code: ArchiveMaterialOcrStatusCode) {
  return strictEnumTone(ARCHIVE_MATERIAL_OCR_STATUS_TONE, code, 'ocrStatus')
}

function formatTerm(academicYear?: string, semester?: SemesterCode) {
  if (!academicYear && !semester) return '-'
  if (!academicYear || !semester) return academicYear || formatSemester(semester)
  return `${academicYear} ${formatSemester(semester)}`
}

function parseTagAnyKeyword(raw: string): string[] | undefined {
  const tags = raw
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return tags.length > 0 ? tags : undefined
}

function hasSearchCriterion(): boolean {
  return Boolean(
    filterForm.keyword.trim()
    || filterForm.studentNo.trim()
    || filterForm.studentNameKeyword.trim()
    || filterForm.archiveKeyword.trim()
    || filterForm.catalogCode.trim()
    || filterForm.catalogNameKeyword.trim()
    || parseTagAnyKeyword(filterForm.tagAnyKeyword)
    || filterForm.fileNameKeyword.trim()
    || filterForm.classNameKeyword.trim()
    || filterForm.departmentId
    || filterForm.courseId
    || filterForm.volumeId
    || filterForm.examId
    || filterForm.ocrStatus
    || filterForm.materialType
    || filterForm.academicYear
    || filterForm.semester,
  )
}

function buildSearchCriteriaFromFilter(): ArchiveVolumeMaterialSearchCriteria {
  const termQuery = buildOptionalAcademicYearSemesterQuery(
    filterForm.academicYear,
    filterForm.semester,
  ) ?? {}
  return {
    keyword: filterForm.keyword.trim() || undefined,
    volumeId: filterForm.volumeId || undefined,
    examId: filterForm.examId || undefined,
    studentNo: filterForm.studentNo.trim() || undefined,
    studentNameKeyword: filterForm.studentNameKeyword.trim() || undefined,
    archiveKeyword: filterForm.archiveKeyword.trim() || undefined,
    catalogCode: filterForm.catalogCode.trim() || undefined,
    catalogNameKeyword: filterForm.catalogNameKeyword.trim() || undefined,
    tagAny: parseTagAnyKeyword(filterForm.tagAnyKeyword),
    fileNameKeyword: filterForm.fileNameKeyword.trim() || undefined,
    classNameKeyword: filterForm.classNameKeyword.trim() || undefined,
    departmentId: filterForm.departmentId || undefined,
    courseId: filterForm.courseId || undefined,
    ocrStatus: filterForm.ocrStatus,
    materialType: filterForm.materialType,
    ...termQuery,
  }
}

function buildSearchRequest(): ArchiveVolumeSearchRequest {
  return {
    ...buildSearchCriteriaFromFilter(),
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
  }
}

function applyCriteriaToFilter(criteria: ArchiveVolumeMaterialSearchCriteria) {
  filterForm.keyword = criteria.keyword ?? ''
  filterForm.examId = criteria.examId
  filterForm.studentNo = criteria.studentNo ?? ''
  filterForm.studentNameKeyword = criteria.studentNameKeyword ?? ''
  filterForm.archiveKeyword = criteria.archiveKeyword ?? ''
  filterForm.catalogCode = criteria.catalogCode ?? ''
  filterForm.catalogNameKeyword = criteria.catalogNameKeyword ?? ''
  filterForm.tagAnyKeyword = criteria.tagAny?.join('，') ?? ''
  filterForm.fileNameKeyword = criteria.fileNameKeyword ?? ''
  filterForm.classNameKeyword = criteria.classNameKeyword ?? ''
  filterForm.departmentId = criteria.departmentId
  filterForm.courseId = criteria.courseId
  filterForm.ocrStatus = criteria.ocrStatus
  filterForm.materialType = criteria.materialType
  filterForm.academicYear = criteria.academicYear
  filterForm.semester = criteria.semester
  filterForm.volumeId = criteria.volumeId
}

async function loadExamOptions(keyword?: string) {
  examLoading.value = !keyword
  examSearching.value = Boolean(keyword)
  try {
    const page = await pageExams({
      pageNum: 1,
      pageSize: 20,
      status: ExamStatusCode.ACTIVE,
      keyword: keyword?.trim() || undefined,
    })
    examOptions.value = page.list.map(toMarkExamSelectOption)
  } catch (error) {
    showUserError(error, '考试列表加载失败')
  } finally {
    examLoading.value = false
    examSearching.value = false
  }
}

async function ensureExamOption(examId?: string) {
  if (!examId || examOptions.value.some((option) => option.value === examId)) {
    return
  }
  try {
    const option = toMarkExamSelectOption(examSummaryFromDetail(await getExamDetail(examId)))
    examOptions.value = [option, ...examOptions.value.filter((item) => item.value !== option.value)]
  } catch (error) {
    showUserError(error, '考试筛选项加载失败')
  }
}

function handleExamSearch(keyword: string) {
  void loadExamOptions(keyword)
}

function handleExamChange(value: SelectValue): void {
  filterForm.examId = value != null ? String(value) : undefined
}

async function loadDepartments() {
  try {
    const departments = await departmentCatalogApi.list()
    departmentOptions.value = departments.map((item: TenantSchoolDepartmentDto) => ({
      value: item.id,
      label: item.deptName,
    }))
  } catch (error) {
    showUserError(error)
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

async function loadSearchProfiles() {
  profilesLoading.value = true
  try {
    searchProfiles.value = await listArchiveVolumeSearchProfiles()
  } catch (error) {
    showUserError(error)
  } finally {
    profilesLoading.value = false
  }
}

async function loadHits() {
  if (!hasSearchCriterion()) {
    hits.value = []
    pagination.total = 0
    return
  }
  if (!ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)) {
    return
  }
  loading.value = true
  try {
    const result = await searchArchiveVolumes(buildSearchRequest())
    hits.value = result.list
    pagination.total = Number(result.total)
    pagination.pageNum = result.pageNum
    pagination.pageSize = result.pageSize
  } catch (error) {
    showUserError(error, '材料检索失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (!hasSearchCriterion()) {
    message.warning('请至少填写一项检索条件')
    return
  }
  if (!ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)) {
    return
  }
  pagination.pageNum = 1
  void loadHits()
}

function applySearchExample(keyword: string) {
  filterForm.keyword = keyword
  handleSearch()
}

function handleReset() {
  const scopedVolumeId = filterForm.volumeId
  filterForm.keyword = ''
  filterForm.studentNo = ''
  filterForm.studentNameKeyword = ''
  filterForm.archiveKeyword = ''
  filterForm.catalogCode = ''
  filterForm.catalogNameKeyword = ''
  filterForm.tagAnyKeyword = ''
  filterForm.fileNameKeyword = ''
  filterForm.classNameKeyword = ''
  filterForm.departmentId = undefined
  filterForm.courseId = undefined
  filterForm.examId = undefined
  filterForm.ocrStatus = undefined
  filterForm.materialType = undefined
  filterForm.academicYear = undefined
  filterForm.semester = undefined
  filterForm.volumeId = scopedVolumeId
  selectedProfileId.value = undefined
  hits.value = []
  pagination.pageNum = 1
  pagination.total = 0
}

function highlightSnippet(snippet: string): string {
  return highlightArchiveSearchSnippet(snippet, filterForm.keyword)
}

function canViewMaterialOcr(record: ArchiveVolumeSearchResponse): boolean {
  return record.ocrStatus === 'COMPLETED'
    || record.ocrStatus === 'FAILED'
    || record.ocrStatus === 'RUNNING'
}

function openMaterialOcr(record: ArchiveVolumeSearchResponse): void {
  ocrDetailMaterialId.value = record.materialId
  ocrDetailInitialPageNo.value = record.matchPageNo
  ocrDetailOpen.value = true
}

function openMaterialOcrPreview(record: ArchiveVolumeSearchResponse): void {
  ocrInlineMaterialId.value = record.materialId
  ocrInlinePageNo.value = record.matchPageNo
  ocrInlineFileName.value = record.fileName
}

function closeOcrInlinePanel(): void {
  ocrInlineMaterialId.value = undefined
  ocrInlinePageNo.value = undefined
  ocrInlineFileName.value = undefined
}

function openSaveProfileModal(mode: 'update' | 'saveAs') {
  if (!hasSearchCriterion()) {
    message.warning('请至少填写一项检索条件后再保存')
    return
  }
  if (mode === 'update' && !selectedOwnedProfile.value) {
    message.warning('请选择本人拥有的方案后再更新')
    return
  }
  saveProfileMode.value = mode
  const existing = searchProfiles.value.find((item) => item.profileId === selectedProfileId.value)
  saveProfileForm.profileName = mode === 'update' ? (existing?.profileName ?? '') : ''
  saveProfileForm.sharedFlag = mode === 'update' ? (existing?.sharedFlag ?? false) : false
  saveProfileModalOpen.value = true
}

async function handleSaveProfile() {
  const profileName = saveProfileForm.profileName.trim()
  if (!profileName) {
    message.warning('请填写方案名称')
    return
  }
  saveProfileLoading.value = true
  try {
    const saved = await saveArchiveVolumeSearchProfile({
      profileId: saveProfileMode.value === 'update' && selectedOwnedProfile.value
        ? selectedProfileId.value
        : undefined,
      profileName,
      sharedFlag: saveProfileForm.sharedFlag,
      criteria: buildSearchCriteriaFromFilter(),
    })
    message.success(saveProfileMode.value === 'update' ? '检索方案已更新' : '检索方案已保存')
    saveProfileModalOpen.value = false
    await loadSearchProfiles()
    selectedProfileId.value = saved.profileId
  } catch (error) {
    showUserError(error, '保存检索方案失败')
  } finally {
    saveProfileLoading.value = false
  }
}

function applySelectedProfile() {
  const profile = searchProfiles.value.find((item) => item.profileId === selectedProfileId.value)
  if (!profile) {
    message.warning('请选择检索方案')
    return
  }
  applyCriteriaToFilter(profile.criteria)
  void ensureExamOption(profile.criteria.examId)
  pagination.pageNum = 1
  void loadHits()
}

function handleDeleteProfile() {
  if (!selectedProfileId.value || !selectedOwnedProfile.value) return
  Modal.confirm({
    title: '删除检索方案',
    content: '删除后不可恢复，确认删除当前方案？',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteArchiveVolumeSearchProfile(selectedProfileId.value!)
        message.success('检索方案已删除')
        selectedProfileId.value = undefined
        await loadSearchProfiles()
      } catch (error) {
        showUserError(error, '删除检索方案失败')
      }
    },
  })
}

function goDetail(volumeId: string) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: 'materials' },
  })
}

function goDetailOcrSearch(volumeId: string) {
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: 'ocr-search' },
  })
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

onMounted(() => {
  void loadDepartments()
  void loadCourses()
  void loadExamOptions()
  void loadSearchProfiles()
  const rawVolumeId = route.query.volumeId
  if (typeof rawVolumeId === 'string' && rawVolumeId.trim()) {
    filterForm.volumeId = rawVolumeId.trim()
  }
  const rawExamId = route.query.examId
  if (typeof rawExamId === 'string' && rawExamId.trim()) {
    filterForm.examId = rawExamId.trim()
    void ensureExamOption(filterForm.examId)
  }
  if (filterForm.volumeId || filterForm.examId) {
    void loadHits()
  }
})
</script>

<style scoped>
.archive-search-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}
.archive-search-toolbar__profiles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
}
.archive-search-toolbar__profile-select {
  min-width: 220px;
}
.archive-search-toolbar__examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  font-size: 12px;
}
.archive-search-toolbar__examples-label {
  color: var(--dp-text-muted, #64748b);
}

.archive-search-primary {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--dp-space-2, 8px);
}

.archive-search-primary__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.archive-search-primary__field--keyword {
  flex: 1;
  min-width: 220px;
}

.archive-search-primary__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--dp-text-secondary, #475569);
}

.archive-search-primary__select {
  min-width: 140px;
}

.archive-search-primary__exam-select {
  min-width: 280px;
}

.archive-search-primary__submit {
  flex-shrink: 0;
}

.archive-search-result-meta {
  margin: 0 0 var(--dp-space-3, 12px);
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

.archive-search-snippet-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--dp-space-1, 4px);
  min-width: 0;
}

.archive-search-snippet-meta {
  display: flex;
  justify-content: flex-end;
}

.archive-search-page-no {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--dp-font-mono, ui-monospace, monospace);
  color: var(--dp-text-muted, #94a3b8);
}
.archive-search-ocr-panel {
  margin-top: var(--dp-space-3, 12px);
}
.archive-search-ocr-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
}
.archive-search-ocr-panel__title {
  font-weight: 600;
}
.archive-search-ocr-panel__file {
  flex: 1;
  min-width: 0;
  color: var(--text-secondary, #8c8c8c);
  font-size: 13px;
}
.link-cell__sub {
  color: var(--text-secondary, #8c8c8c);
  font-size: 12px;
}
</style>
