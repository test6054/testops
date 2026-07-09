/**
 * 教学质量评价跨页面上下文 Store
 *
 * 用途：
 * - 跨「专业大类 → 培养方案 → 毕业要求 → 质量评价课程 → 成绩 / 达成度 / 改进 / 报告 / 归档」
 *   等页面共享 当前专业大类、培养方案、学年、学期、质量评价课程、认证主体。
 * - 缓存常用目录数据（专业大类 / 院系 / 培养方案 / 毕业要求 / 质量评价课程），减少重复请求。
 *
 * 设计原则：
 * - 上下文切换（setProgram / setTrainingPlan）会自动清空"下游"缓存，防止串数据。
 * - 持久化只保存少量"用户选择"字段，目录缓存只放内存。
 */
import type { GraduationRequirementVO } from '@/apis/quality/graduation-requirement'
import { graduationRequirementApi } from '@/apis/quality/graduation-requirement'
import type { QualityCourseVO } from '@/apis/quality/quality-course'
import { qualityCourseApi } from '@/apis/quality/quality-course'
import type { TrainingPlanVO } from '@/apis/quality/training-plan'
import { trainingPlanApi } from '@/apis/quality/training-plan'
import type { MajorCategoryVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { departmentCatalogApi, majorCategoryCatalogApi } from '@/apis/quality/user-catalog'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { ALL_SEMESTER_CODES } from '@/types/enums/semester-enum'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  loadSelectorFirstPage,
  QUALITY_SELECTOR_PAGE_SIZE,
} from '@/components/quality/selectors/page-contract'
import { sanitizePersistedSchoolPeriod } from '@/utils/semester-contract'

export const useQualityStore = defineStore(
  'quality',
  () => {
    /* ========== 当前上下文（持久化） ========== */

    /** 当前专业大类 ID（edu-user 的 MajorCategory） */
    const currentProgramId = ref<string>('')

    /** 当前认证主体（专业评估配置）ID */
    const currentAccreditationProfileId = ref<string>('')

    /** 当前培养方案 ID */
    const currentTrainingPlanId = ref<string>('')

    /** 当前学年（如 2025-2026） */
    const currentSchoolYear = ref<string>('')

    /** 当前学期（SemesterCode：秋季 / 春季） */
    const currentSemester = ref<SemesterCode | undefined>(undefined)

    /** 当前质量评价课程 ID（供成绩导入 / 达成度触发默认回填） */
    const currentQualityCourseId = ref<string>('')

    /* ========== 目录缓存（仅内存，不持久化） ========== */

    /** 全局专业大类列表（super_admin 维护） */
    const majorCategoryOptions = ref<MajorCategoryVO[]>([])
    const majorCategoryLoading = ref(false)

    /** 当前租户院系列表 */
    const departmentOptions = ref<TenantSchoolDepartmentDto[]>([])
    const departmentLoading = ref(false)

    /** 培养方案列表 - 按当前 programId 筛选 */
    const trainingPlanOptions = ref<TrainingPlanVO[]>([])
    const trainingPlanLoading = ref(false)

    /** 毕业要求列表 - 按当前 trainingPlanId 筛选 */
    const requirementOptions = ref<GraduationRequirementVO[]>([])
    const requirementLoading = ref(false)

    /** 质量评价课程列表 - 按当前 trainingPlanId / schoolYear / semester 筛选 */
    const qualityCourseOptions = ref<QualityCourseVO[]>([])
    const qualityCourseLoading = ref(false)

    /** Layout / 页面范围切换代际，供 keepAlive 页面统一刷新 */
    const scopeChangeEpoch = ref(0)

    function bumpScopeChangeEpoch(): void {
      scopeChangeEpoch.value += 1
    }

    /* ========== Computed ========== */

    const hasProgram = computed(() => !!currentProgramId.value)
    const hasPlan = computed(() => !!currentTrainingPlanId.value)
    const hasCourse = computed(() => !!currentQualityCourseId.value)

    const currentPlan = computed<TrainingPlanVO | undefined>(() =>
      trainingPlanOptions.value.find((item) => item.id === currentTrainingPlanId.value),
    )

    const currentCourse = computed<QualityCourseVO | undefined>(() =>
      qualityCourseOptions.value.find((item) => item.id === currentQualityCourseId.value),
    )

    const currentProgram = computed<MajorCategoryVO | undefined>(() =>
      majorCategoryOptions.value.find((item) => item.id === currentProgramId.value),
    )

    /* ========== 目录加载 ========== */

    async function loadMajorCategoryOptions(force = false) {
      if (!force && majorCategoryOptions.value.length > 0) return majorCategoryOptions.value
      majorCategoryLoading.value = true
      try {
        majorCategoryOptions.value = (await majorCategoryCatalogApi.listAll()) || []
        return majorCategoryOptions.value
      } catch {
        majorCategoryOptions.value = []
        return majorCategoryOptions.value
      } finally {
        majorCategoryLoading.value = false
      }
    }

    async function loadDepartmentOptions(force = false) {
      if (!force && departmentOptions.value.length > 0) return departmentOptions.value
      departmentLoading.value = true
      try {
        departmentOptions.value = (await departmentCatalogApi.list()) || []
        return departmentOptions.value
      } finally {
        departmentLoading.value = false
      }
    }

    async function loadTrainingPlanOptions(opts?: { programId?: string; keyword?: string }) {
      trainingPlanLoading.value = true
      try {
        const page = await trainingPlanApi.page({
          pageNum: 1,
          pageSize: QUALITY_SELECTOR_PAGE_SIZE,
          enabled: true,
          programId: opts?.programId || currentProgramId.value || undefined,
          keyword: opts?.keyword?.trim() || undefined,
        })
        trainingPlanOptions.value = page.list
        return trainingPlanOptions.value
      } catch {
        trainingPlanOptions.value = []
        return trainingPlanOptions.value
      } finally {
        trainingPlanLoading.value = false
      }
    }

    async function loadRequirementOptions(trainingPlanId?: string) {
      const planId = trainingPlanId || currentTrainingPlanId.value
      if (!planId) {
        requirementOptions.value = []
        return requirementOptions.value
      }
      requirementLoading.value = true
      try {
        requirementOptions.value = await loadSelectorFirstPage((pageNum, pageSize) =>
          graduationRequirementApi.page({ pageNum, pageSize, trainingPlanId: planId }),
        )
        return requirementOptions.value
      } finally {
        requirementLoading.value = false
      }
    }

    async function loadQualityCourseOptions(opts?: {
      trainingPlanId?: string
      schoolYear?: string
      semester?: SemesterCode
    }) {
      const planId = opts?.trainingPlanId || currentTrainingPlanId.value
      if (!planId) {
        qualityCourseOptions.value = []
        return qualityCourseOptions.value
      }
      qualityCourseLoading.value = true
      try {
        const page = await qualityCourseApi.page({
          pageNum: 1,
          pageSize: QUALITY_SELECTOR_PAGE_SIZE,
          trainingPlanId: planId,
          schoolYear: opts?.schoolYear || currentSchoolYear.value || undefined,
          semester: opts?.semester || currentSemester.value || undefined,
          enabled: true,
        })
        qualityCourseOptions.value = page.list
        return qualityCourseOptions.value
      } finally {
        qualityCourseLoading.value = false
      }
    }

    /* ========== 上下文切换 ========== */

    /** 切换专业大类：清空下游 trainingPlan / course / requirement 缓存 */
    function setProgram(programId: string, accreditationProfileId?: string) {
      const programChanged = currentProgramId.value !== programId
      if (programChanged) {
        currentTrainingPlanId.value = ''
        currentQualityCourseId.value = ''
        trainingPlanOptions.value = []
        requirementOptions.value = []
        qualityCourseOptions.value = []
      }
      currentProgramId.value = programId
      if (accreditationProfileId !== undefined) {
        currentAccreditationProfileId.value = accreditationProfileId
      }
      if (programChanged) {
        bumpScopeChangeEpoch()
      }
    }

    /** 切换培养方案：清空下游 requirement / course 缓存 */
    function setTrainingPlan(trainingPlanId: string) {
      const normalizedPlanId = trainingPlanId.trim()
      const planChanged = currentTrainingPlanId.value !== normalizedPlanId
      if (planChanged) {
        currentQualityCourseId.value = ''
        requirementOptions.value = []
        qualityCourseOptions.value = []
      }
      currentTrainingPlanId.value = normalizedPlanId
      if (planChanged) {
        bumpScopeChangeEpoch()
      }
    }

    function sanitizePersistedScope(): void {
      const sanitized = sanitizePersistedSchoolPeriod(
        currentSchoolYear.value,
        currentSemester.value,
      )
      currentSchoolYear.value = sanitized.schoolYear
      currentSemester.value = sanitized.semester
    }

    function setSchoolPeriod(schoolYear?: string, semester?: SemesterCode | null) {
      let changed = false

      if (schoolYear !== undefined) {
        const trimmed = schoolYear.trim()
        if (currentSchoolYear.value !== trimmed) {
          currentSchoolYear.value = trimmed
          changed = true
        }
        if (!trimmed && currentSemester.value !== undefined) {
          currentSemester.value = undefined
          changed = true
        }
      }

      if (semester !== undefined) {
        let next: SemesterCode | undefined
        if (semester === null || semester === undefined) {
          next = undefined
        } else if (!ALL_SEMESTER_CODES.includes(semester) || !currentSchoolYear.value.trim()) {
          next = undefined
        } else {
          next = semester
        }
        if (currentSemester.value !== next) {
          currentSemester.value = next
          changed = true
        }
      }

      if (changed) {
        qualityCourseOptions.value = []
        bumpScopeChangeEpoch()
      }
    }

    function setQualityCourse(qualityCourseId: string) {
      if (currentQualityCourseId.value !== qualityCourseId) {
        currentQualityCourseId.value = qualityCourseId
        bumpScopeChangeEpoch()
      }
    }

    function reset() {
      currentProgramId.value = ''
      currentAccreditationProfileId.value = ''
      currentTrainingPlanId.value = ''
      currentSchoolYear.value = ''
      currentSemester.value = undefined
      currentQualityCourseId.value = ''
      majorCategoryOptions.value = []
      departmentOptions.value = []
      trainingPlanOptions.value = []
      requirementOptions.value = []
      qualityCourseOptions.value = []
      bumpScopeChangeEpoch()
    }

    return {
      // 上下文
      currentProgramId,
      currentAccreditationProfileId,
      currentTrainingPlanId,
      currentSchoolYear,
      currentSemester,
      currentQualityCourseId,

      // 目录缓存
      majorCategoryOptions,
      majorCategoryLoading,
      departmentOptions,
      departmentLoading,
      trainingPlanOptions,
      trainingPlanLoading,
      requirementOptions,
      requirementLoading,
      qualityCourseOptions,
      qualityCourseLoading,
      scopeChangeEpoch,

      // computed
      hasProgram,
      hasPlan,
      hasCourse,
      currentProgram,
      currentPlan,
      currentCourse,

      // actions - 目录
      loadMajorCategoryOptions,
      loadDepartmentOptions,
      loadTrainingPlanOptions,
      loadRequirementOptions,
      loadQualityCourseOptions,

      // actions - 上下文
      setProgram,
      setTrainingPlan,
      setSchoolPeriod,
      setQualityCourse,
      reset,
      sanitizePersistedScope,
    }
  },
  {
    persist: {
      pick: [
        'currentProgramId',
        'currentAccreditationProfileId',
        'currentTrainingPlanId',
        'currentSchoolYear',
        'currentSemester',
        'currentQualityCourseId',
      ],
      afterHydrate: (ctx) => {
        ctx.store.sanitizePersistedScope()
      },
    },
  },
)
