import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'
import type { ClassInfoDto } from '@/apis/edu/class'
import { getClassesByDepartment } from '@/apis/edu/class'
import type { ClassSelectOption } from '@/views/teacher/candidate-roster/class-scope'
import { mergeClassSelectOptions } from '@/views/teacher/candidate-roster/class-scope'
import { listCreateEnrollableClasses } from '@/apis/mark/exam'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import { showUserError } from '@/utils/error-handler'

export interface ExamDepartmentClassScopeSeed {
  classId: string
  className: string
}

/**
 * 考试参考班级：先选院系，再在该院系下多选班级；已选班级跨院系切换时保留。
 */
export function useExamDepartmentClassScope(options: {
  selectedClassIds: Ref<string[]>
  seedOptions?: Ref<ExamDepartmentClassScopeSeed[]>
  /** 创建考试：仅展示 mark 名册真源确认有在籍学生的班级 */
  enrollableOnly?: boolean
}) {
  const departmentId = ref<string | undefined>()
  const departmentLoading = ref(false)
  const departmentOptions = ref<Array<{ value: string; label: string }>>([])
  const classOptionsLoading = ref(false)
  const departmentClassOptions = ref<ClassSelectOption[]>([])
  const cumulativeClassLabels = ref<Map<string, string>>(new Map())

  const classSelectOptions = computed(() => {
    const seeds: ExamDepartmentClassScopeSeed[] = []
    for (const item of options.seedOptions?.value ?? []) {
      seeds.push(item)
    }
    for (const [classId, className] of cumulativeClassLabels.value.entries()) {
      seeds.push({ classId, className })
    }
    return mergeClassSelectOptions(
      seeds.map((item) => ({ classId: item.classId, className: item.className })),
      departmentClassOptions.value,
    )
  })

  function rememberClassLabels(classes: ClassInfoDto[]): void {
    const next = new Map(cumulativeClassLabels.value)
    for (const item of classes) {
      if (item.id && item.className) {
        next.set(String(item.id), item.className)
      }
    }
    cumulativeClassLabels.value = next
  }

  async function loadDepartments(): Promise<void> {
    departmentLoading.value = true
    try {
      const departments = await departmentCatalogApi.list()
      departmentOptions.value = departments.map((item) => ({
        value: item.id,
        label: item.deptName,
      }))
    } catch (error) {
      departmentOptions.value = []
      showUserError(error, '院系列表加载失败')
    } finally {
      departmentLoading.value = false
    }
  }

  async function loadClassesForDepartment(): Promise<void> {
    if (!departmentId.value) {
      departmentClassOptions.value = []
      return
    }
    classOptionsLoading.value = true
    try {
      if (options.enrollableOnly) {
        const classes = await listCreateEnrollableClasses({
          referenceDepartmentId: departmentId.value,
        })
        rememberClassLabels(
          classes.map((item) => ({
            id: item.classId,
            className: item.className,
          })),
        )
        departmentClassOptions.value = classes
          .filter((item) => item.classId && item.className && item.studentCount > 0)
          .map((item) => ({
            value: String(item.classId),
            label: item.className,
          }))
        return
      }
      const classes = await getClassesByDepartment({ departmentId: departmentId.value })
      rememberClassLabels(classes)
      departmentClassOptions.value = classes
        .filter((item) => item.id && item.className && (item.studentCount ?? 0) > 0)
        .map((item) => ({
          value: String(item.id),
          label: item.className!,
        }))
    } catch (error) {
      departmentClassOptions.value = []
      showUserError(error, '参考班级加载失败')
    } finally {
      classOptionsLoading.value = false
    }
  }

  watch(departmentId, () => {
    void loadClassesForDepartment()
  })

  watch(
    () => [...options.selectedClassIds.value],
    (classIds) => {
      const next = new Map(cumulativeClassLabels.value)
      for (const classId of classIds) {
        if (!next.has(classId)) {
          next.set(classId, classId)
        }
      }
      cumulativeClassLabels.value = next
    },
    { immediate: true },
  )

  return {
    departmentId,
    departmentLoading,
    departmentOptions,
    classOptionsLoading,
    classSelectOptions,
    loadDepartments,
    loadClassesForDepartment,
    rememberClassLabels,
  }
}
