<script setup lang="ts">
import type { ClassInfoDto } from '@/apis/edu/class'
import type { CourseListVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { watch } from 'vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import DepartmentSelector from '@/components/quality/selectors/DepartmentSelector.vue'

defineOptions({ name: 'AnalysisOrgScopeBar' })

const departmentId = defineModel<string | null>('departmentId')
const courseId = defineModel<string | null>('courseId')
const classId = defineModel<string | null>('classId')

withDefaults(
  defineProps<{
    departmentPlaceholder?: string
    coursePlaceholder?: string
    classPlaceholder?: string
    showDepartment?: boolean
    showCourse?: boolean
    showClass?: boolean
  }>(),
  {
    departmentPlaceholder: '全部院系',
    coursePlaceholder: '全部课程',
    classPlaceholder: '全部班级',
    showDepartment: true,
    showCourse: true,
    showClass: true,
  },
)

const emit = defineEmits<{
  (e: 'department-change', value: string | null, option?: TenantSchoolDepartmentDto): void
  (e: 'course-change', value: string | null, option?: CourseListVO): void
  (e: 'class-change', value: string | null, option?: ClassInfoDto): void
}>()

watch(departmentId, (next, prev) => {
  if (next === prev) {
    return
  }
  classId.value = null
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
      <DepartmentSelector
        v-model:value="departmentId"
        :placeholder="departmentPlaceholder"
        width="180px"
        @change="handleDepartmentChange"
      />
    </a-form-item>
    <a-form-item v-if="showCourse" label="课程" class="analysis-org-scope-bar__item">
      <CatalogCourseSelector
        v-model:value="courseId"
        :placeholder="coursePlaceholder"
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
</style>
