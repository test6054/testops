<script setup lang="ts">
import type { ClassInfoDto } from '@/apis/edu/class'
import type { CourseListVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { computed, watch } from 'vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import DepartmentSelector from '@/components/quality/selectors/DepartmentSelector.vue'

defineOptions({ name: 'AnalysisOrgScopeBar' })

const departmentId = defineModel<string | null>('departmentId')
const courseId = defineModel<string | null>('courseId')
const classId = defineModel<string | null>('classId')

const props = withDefaults(
  defineProps<{
    departmentPlaceholder?: string
    coursePlaceholder?: string
    classPlaceholder?: string
    showDepartment?: boolean
    showCourse?: boolean
    showClass?: boolean
    /** 院系已选定后只读展示，禁止跨院系 */
    departmentLocked?: boolean
    /** 课程已选定后只读展示，禁止跨课程 */
    courseLocked?: boolean
    departmentLabel?: string
    courseLabel?: string
    /** 独立入口：须选定单院系单课程，不允许「全部」 */
    requireOrgScope?: boolean
  }>(),
  {
    departmentPlaceholder: '全部院系',
    coursePlaceholder: '全部课程',
    classPlaceholder: '全部班级',
    showDepartment: true,
    showCourse: true,
    showClass: true,
    departmentLocked: false,
    courseLocked: false,
    departmentLabel: '',
    courseLabel: '',
    requireOrgScope: false,
  },
)

const emit = defineEmits<{
  (e: 'department-change', value: string | null, option?: TenantSchoolDepartmentDto): void
  (e: 'course-change', value: string | null, option?: CourseListVO): void
  (e: 'class-change', value: string | null, option?: ClassInfoDto): void
}>()

const departmentReadonly = computed(
  () => props.departmentLocked && Boolean(departmentId.value?.trim()),
)
const courseReadonly = computed(() => props.courseLocked && Boolean(courseId.value?.trim()))
const resolvedDepartmentPlaceholder = computed(() =>
  props.requireOrgScope ? '请选择院系' : props.departmentPlaceholder,
)
const resolvedCoursePlaceholder = computed(() =>
  props.requireOrgScope ? '请选择课程' : props.coursePlaceholder,
)
const courseSelectorDisabled = computed(
  () => props.requireOrgScope && !departmentId.value?.trim() && !props.courseLocked,
)

watch(departmentId, (next, prev) => {
  if (next === prev) {
    return
  }
  classId.value = null
  if (!props.courseLocked) {
    courseId.value = null
  }
})

function handleDepartmentChange(value: string | null, option?: TenantSchoolDepartmentDto) {
  emit('department-change', value, option)
}

function handleCourseChange(value: string | null, option?: CourseListVO) {
  emit('course-change', value, option)
}

function handleClassChange(value: string | null, option?: ClassInfoDto) {
  emit('class-change', value, option)
}
</script>

<template>
  <div class="analysis-org-scope-bar">
    <a-form-item v-if="showDepartment" label="院系" class="analysis-org-scope-bar__item">
      <span v-if="departmentReadonly" class="analysis-org-scope-bar__fixed">{{
        departmentLabel || '—'
      }}</span>
      <DepartmentSelector
        v-else
        v-model:value="departmentId"
        :placeholder="resolvedDepartmentPlaceholder"
        :allow-clear="!requireOrgScope"
        width="180px"
        @change="handleDepartmentChange"
      />
    </a-form-item>
    <a-form-item v-if="showCourse" label="课程" class="analysis-org-scope-bar__item">
      <span v-if="courseReadonly" class="analysis-org-scope-bar__fixed">{{
        courseLabel || '—'
      }}</span>
      <CatalogCourseSelector
        v-else
        v-model:value="courseId"
        :placeholder="resolvedCoursePlaceholder"
        :allow-clear="!requireOrgScope"
        :disabled="courseSelectorDisabled"
        width="200px"
        @change="handleCourseChange"
      />
    </a-form-item>
    <a-form-item v-if="showClass" label="班级" class="analysis-org-scope-bar__item">
      <ClassSelector
        v-model:value="classId"
        :department-id="departmentId"
        :placeholder="classPlaceholder"
        width="180px"
        @change="handleClassChange"
      />
    </a-form-item>
  </div>
</template>

<style scoped lang="scss">
.analysis-org-scope-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.analysis-org-scope-bar__item {
  margin-bottom: 0;
}

.analysis-org-scope-bar__fixed {
  display: inline-block;
  min-width: 120px;
  max-width: 280px;
  font-size: 14px;
  line-height: 32px;
  color: var(--dp-text-primary);
}
</style>
