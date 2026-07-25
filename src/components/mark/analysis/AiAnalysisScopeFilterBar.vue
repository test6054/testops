<script setup lang="ts">
import type { ClassInfoDto } from '@/apis/edu/class'
import type { CourseListVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import type { FilterField } from '@/components/ui-guide/ui/types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, watch } from 'vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import DepartmentSelector from '@/components/quality/selectors/DepartmentSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { useAiAnalysisScopeContext } from '@/composables/useAiAnalysisScope'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'

defineOptions({ name: 'AiAnalysisScopeFilterBar' })

const props = withDefaults(
  defineProps<{
    /** org-term：趋势/校级 Tab；exam：教学/聚类 Tab */
    mode?: 'org-term' | 'exam'
  }>(),
  { mode: 'org-term' },
)

const {
  academicYear,
  semester,
  examFilterCourseId,
  examId,
  referenceDepartmentId,
  scopeCourseId,
  classId,
  referenceDepartmentLabel,
  scopeCourseLabel,
  examsLoading,
  academicYearOptions,
  semesterOptions,
  examOptions,
  examLocked,
  setExamFilterCourse,
  setOrgDepartmentLabel,
  setOrgCourseLabel,
  setOrgClassLabel,
} = useAiAnalysisScopeContext()

const departmentLocked = computed(() => examLocked.value)
const courseLocked = computed(() => examLocked.value)

const filterModel = computed<Record<string, unknown>>({
  get: () => ({
    referenceDepartmentId: referenceDepartmentId.value ?? null,
    scopeCourseId: scopeCourseId.value ?? null,
    classId: classId.value ?? null,
    academicYear: academicYear.value,
    semester: semester.value,
    examFilterCourseId: examFilterCourseId.value ?? null,
    examId: examId.value,
  }),
  set: (value) => {
    if (value.referenceDepartmentId !== undefined) {
      referenceDepartmentId.value = (value.referenceDepartmentId as string | null) ?? undefined
    }
    if (value.scopeCourseId !== undefined) {
      scopeCourseId.value = (value.scopeCourseId as string | null) ?? undefined
    }
    if (value.classId !== undefined) {
      classId.value = (value.classId as string | null) ?? undefined
    }
    if (value.academicYear !== undefined && typeof value.academicYear === 'string') {
      academicYear.value = value.academicYear
    }
    if (value.semester !== undefined) {
      semester.value = value.semester as typeof semester.value
    }
    if (value.examFilterCourseId !== undefined) {
      examFilterCourseId.value = (value.examFilterCourseId as string | null) ?? undefined
    }
    if (value.examId !== undefined) {
      examId.value = (value.examId as string | undefined) || undefined
    }
  },
})

const filterFields = computed<FilterField[]>(() => {
  if (props.mode === 'exam') {
    return [
      {
        key: 'academicYear',
        type: 'select',
        label: '学年',
        placeholder: '学年',
        allowClear: false,
        width: 120,
        minWidth: 120,
        maxWidth: 140,
        options: academicYearOptions.value,
        triggerSearchOnChange: true,
      },
      {
        key: 'semester',
        type: 'select',
        label: '学期',
        placeholder: '学期',
        allowClear: false,
        width: 120,
        minWidth: 120,
        maxWidth: 140,
        options: semesterOptions.value,
        triggerSearchOnChange: true,
      },
      {
        key: 'examFilterCourseId',
        type: 'custom',
        label: '课程',
        width: 200,
        minWidth: 180,
        maxWidth: 240,
      },
      {
        key: 'examId',
        type: 'custom',
        label: '考试',
        flex: 1,
        minWidth: 240,
        maxWidth: 480,
      },
    ]
  }
  return [
    {
      key: 'academicYear',
      type: 'select',
      label: '学年',
      placeholder: '学年',
      allowClear: false,
      width: 120,
      minWidth: 120,
      maxWidth: 140,
      options: academicYearOptions.value,
      triggerSearchOnChange: true,
    },
    {
      key: 'semester',
      type: 'select',
      label: '学期',
      placeholder: '学期',
      allowClear: false,
      width: 120,
      minWidth: 120,
      maxWidth: 140,
      options: semesterOptions.value,
      triggerSearchOnChange: true,
    },
    {
      key: 'referenceDepartmentId',
      type: 'custom',
      label: '院系',
      width: 160,
      minWidth: 140,
      maxWidth: 200,
    },
    {
      key: 'scopeCourseId',
      type: 'custom',
      label: '课程',
      width: 180,
      minWidth: 160,
      maxWidth: 220,
    },
    {
      key: 'classId',
      type: 'custom',
      label: '班级',
      width: 160,
      minWidth: 140,
      maxWidth: 200,
    },
  ]
})

function handleDepartmentChange(value: string | null, option?: TenantSchoolDepartmentDto): void {
  referenceDepartmentId.value = value ?? undefined
  setOrgDepartmentLabel(option?.deptName?.trim() ?? '')
}

function handleCourseChange(value: string | null, option?: CourseListVO): void {
  if (props.mode === 'exam') {
    setExamFilterCourse(value, option)
    return
  }
  scopeCourseId.value = value ?? undefined
  setOrgCourseLabel(option?.courseName?.trim() ?? '')
}

function handleClassChange(value: string | null, option?: ClassInfoDto): void {
  classId.value = value ?? undefined
  setOrgClassLabel(option?.className ?? '', value)
}

function handleExamFilterCourseChange(value: string | null, option?: CourseListVO): void {
  setExamFilterCourse(value, option)
}

watch(referenceDepartmentId, (next, prev) => {
  if (next === prev) {
    return
  }
  classId.value = undefined
  setOrgClassLabel('', null)
  if (courseLocked.value !== true) {
    scopeCourseId.value = undefined
    setOrgCourseLabel('')
  }
})

function handleReset(): void {
  const defaultTerm = getDefaultAcademicYearAndSemester()
  academicYear.value = defaultTerm.academicYear
  semester.value = defaultTerm.semester
  classId.value = undefined
  setOrgClassLabel('', null)
  if (examLocked.value !== true) {
    if (departmentLocked.value !== true) {
      referenceDepartmentId.value = undefined
      setOrgDepartmentLabel('')
    }
    if (courseLocked.value !== true) {
      scopeCourseId.value = undefined
      examFilterCourseId.value = undefined
      setOrgCourseLabel('')
    }
    examId.value = undefined
  }
}
</script>

<template>
  <UiFilterBar
    v-model="filterModel"
    :fields="filterFields"
    variant="panel"
    show-labels
    @reset="handleReset"
    @search="() => {}"
  >
    <template #actions>
      <UiButton size="sm" variant="outline" class="dp-button-row__btn" @click="handleReset">
        <ReloadOutlined />
        重置范围
      </UiButton>
    </template>
    <template #field-referenceDepartmentId>
      <span v-if="departmentLocked === true" class="ai-analysis-scope-filter-bar__readonly">
        {{ referenceDepartmentLabel || '—' }}
      </span>
      <DepartmentSelector
        v-else
        :value="referenceDepartmentId ?? null"
        placeholder="请选择院系"
        :allow-clear="false"
        width="100%"
        @change="handleDepartmentChange"
      />
    </template>
    <template #field-scopeCourseId>
      <span v-if="courseLocked === true" class="ai-analysis-scope-filter-bar__readonly">
        {{ scopeCourseLabel || '—' }}
      </span>
      <CatalogCourseSelector
        v-else
        :value="scopeCourseId ?? null"
        placeholder="请选择课程"
        :allow-clear="false"
        width="100%"
        @change="handleCourseChange"
      />
    </template>
    <template #field-classId>
      <ClassSelector
        :value="classId ?? null"
        :department-id="referenceDepartmentId"
        placeholder="全部班级"
        width="100%"
        @change="handleClassChange"
      />
    </template>
    <template #field-examFilterCourseId>
      <CatalogCourseSelector
        :value="examFilterCourseId ?? null"
        placeholder="课程（可选）"
        width="100%"
        @change="handleExamFilterCourseChange"
      />
    </template>
    <template #field-examId>
      <UiSelect
        v-model="examId"
        :options="examOptions"
        :loading="examsLoading"
        placeholder="请选择考试"
        allow-search
      />
    </template>
  </UiFilterBar>
</template>

<style scoped lang="scss">
.ai-analysis-scope-filter-bar__readonly {
  display: block;
  min-height: 32px;
  padding: 4px 0;
  font-size: var(--dp-font-body);
  line-height: 24px;
  color: var(--dp-text-primary);
}
</style>
