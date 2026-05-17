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
import type { GraduationRequirementVO, QualityCourseVO, TrainingPlanVO } from '@/apis/quality'
import { graduationRequirementApi, qualityCourseApi, trainingPlanApi } from '@/apis/quality'
import type { MajorCategoryVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { departmentCatalogApi, majorCategoryCatalogApi } from '@/apis/quality/user-catalog'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

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

    /** 当前学期（FALL / SPRING / SUMMER 等） */
    const currentSemester = ref<string>('')

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
          pageSize: 200,
          enabled: true,
          programId: opts?.programId || currentProgramId.value || undefined,
          keyword: opts?.keyword?.trim() || undefined,
        })
        trainingPlanOptions.value = page.list || []
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
        requirementOptions.value = (await graduationRequirementApi.listByPlan(planId)) || []
        return requirementOptions.value
      } finally {
        requirementLoading.value = false
      }
    }

    async function loadQualityCourseOptions(opts?: {
      trainingPlanId?: string
      schoolYear?: string
      semester?: string
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
          pageSize: 200,
          trainingPlanId: planId,
          schoolYear: opts?.schoolYear || currentSchoolYear.value || undefined,
          semester: opts?.semester || currentSemester.value || undefined,
          enabled: true,
        })
        qualityCourseOptions.value = page.list || []
        return qualityCourseOptions.value
      } finally {
        qualityCourseLoading.value = false
      }
    }

    /* ========== 上下文切换 ========== */

    /** 切换专业大类：清空下游 trainingPlan / course / requirement 缓存 */
    function setProgram(programId: string, accreditationProfileId?: string) {
      if (currentProgramId.value !== programId) {
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
    }

    /** 切换培养方案：清空下游 requirement / course 缓存 */
    function setTrainingPlan(trainingPlanId: string) {
      if (currentTrainingPlanId.value !== trainingPlanId) {
        currentQualityCourseId.value = ''
        requirementOptions.value = []
        qualityCourseOptions.value = []
      }
      currentTrainingPlanId.value = trainingPlanId
    }

    function setSchoolPeriod(schoolYear?: string, semester?: string) {
      if (schoolYear !== undefined) currentSchoolYear.value = schoolYear
      if (semester !== undefined) currentSemester.value = semester
      // 学期切换会影响 quality course 列表
      qualityCourseOptions.value = []
    }

    function setQualityCourse(qualityCourseId: string) {
      currentQualityCourseId.value = qualityCourseId
    }

    /** 兼容旧调用：批量设置（不会主动清缓存） */
    function setCurrent(options: {
      programId?: string
      accreditationProfileId?: string
      trainingPlanId?: string
      schoolYear?: string
      semester?: string
      qualityCourseId?: string
    }) {
      if (options.programId !== undefined) currentProgramId.value = options.programId
      if (options.accreditationProfileId !== undefined)
        currentAccreditationProfileId.value = options.accreditationProfileId
      if (options.trainingPlanId !== undefined) currentTrainingPlanId.value = options.trainingPlanId
      if (options.schoolYear !== undefined) currentSchoolYear.value = options.schoolYear
      if (options.semester !== undefined) currentSemester.value = options.semester
      if (options.qualityCourseId !== undefined)
        currentQualityCourseId.value = options.qualityCourseId
    }

    function reset() {
      currentProgramId.value = ''
      currentAccreditationProfileId.value = ''
      currentTrainingPlanId.value = ''
      currentSchoolYear.value = ''
      currentSemester.value = ''
      currentQualityCourseId.value = ''
      majorCategoryOptions.value = []
      departmentOptions.value = []
      trainingPlanOptions.value = []
      requirementOptions.value = []
      qualityCourseOptions.value = []
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
      setCurrent,
      reset,
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
    },
  },
)
