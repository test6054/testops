import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
/**
 * 批改主链公共考试选择器 composable
 *
 * - 默认从 URL `query.examId` 初始化
 * - 自动加载当前租户 ACTIVE 状态的考试列表（教师看自己创建或被分配评阅的考试，全租户读视角看租户范围）
 * - 切换考试会同步写回 URL query，便于刷新和链接分享
 *
 * 用法示例：
 *   const { selectedExamId, examOptions, loading, init, onExamChange } = useMarkExamSelector()
 *   onMounted(init)
 */
import type { ExamSummaryVO } from '@/apis/mark/exam'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pageExams } from '@/apis/mark/exam'
import { useAuthStore } from '@/stores/modules/auth'
import { useMarkExamContextStore } from '@/stores/modules/markExamContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'

export interface MarkExamSelectorOptions {
  /** 是否在切换时自动回写 URL query，默认 true */
  syncUrl?: boolean
  /** 最大加载数量，默认 200 */
  maxLoad?: number
}

export interface MarkExamSelectOption {
  value: string
  label: string
}

export function useMarkExamSelector(options: MarkExamSelectorOptions = {}) {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const examContext = useMarkExamContextStore()
  const markStageStore = useMarkStageStore()

  const syncUrl = options.syncUrl ?? true
  const maxLoad = options.maxLoad ?? 200

  const exams = ref<ExamSummaryVO[]>([])
  const loading = ref(false)

  // 应用优先级：URL > 全局 Store > 空
  const initialId
    = (route.query.examId ? String(route.query.examId) : '') || examContext.currentExamId || ''
  const selectedExamId = ref<string | undefined>(initialId || undefined)

  // 页面本地选择变化 → 同步到全局 Store，使跨页面访问保持一致
  watch(selectedExamId, (next) => {
    if (next && next !== examContext.currentExamId) {
      void examContext.setCurrentExam(next, { ensureDetail: true })
    } else if (!next && examContext.currentExamId) {
      void examContext.setCurrentExam('')
    }
  })

  // 全局 Store 变化 → 同步到本页面，保持多 Tab 一致
  watch(
    () => examContext.currentExamId,
    (next) => {
      if (next && next !== selectedExamId.value) {
        selectedExamId.value = next
        if (syncUrl) writeExamIdToUrl(next)
      }
    },
  )

  const selectedExam = computed<ExamSummaryVO | null>(
    () => exams.value.find((item) => item.examId === selectedExamId.value) ?? null,
  )

  const examOptions = computed<MarkExamSelectOption[]>(() =>
    exams.value.map((item) => ({
      value: item.examId,
      label: [formatExamOptionLabel(item), formatAcademicTerm(item)].filter(Boolean).join(' · '),
    })),
  )

  const selectedExamLabel = computed(() => markStageStore.selectedExamLabel)

  /** 是否全租户读视角：与后端 ExamMarkPermissionService.hasFullTenantReadView() 保持一致。 */
  const isAdminView = computed(() => {
    const role = authStore.userRole
    return (
      role === RoleEnum.SUPER_ADMIN || role === RoleEnum.CROP_ADMIN || role === RoleEnum.CROP_USER
    )
  })

  async function loadExams(): Promise<void> {
    loading.value = true
    try {
      const result = await pageExams({
        pageNum: 1,
        pageSize: maxLoad,
        status: 'ACTIVE',
        createUserId: isAdminView.value ? null : userStore.userInfo.userId || undefined,
      })
      exams.value = result.list
      // 同步考试列表到全局 Store，供跨页面下拉复用
      examContext.exams = exams.value
      // URL / Store 都未指定时默认选第一个
      if (!selectedExamId.value && exams.value.length > 0) {
        selectedExamId.value = exams.value[0].examId
        if (syncUrl) {
          writeExamIdToUrl(selectedExamId.value)
        }
      } else if (selectedExamId.value) {
        await examContext.setCurrentExam(selectedExamId.value, { ensureDetail: true })
      }
    } catch (error) {
      showUserError(error, '考试列表加载失败')
    } finally {
      loading.value = false
    }
  }

  function writeExamIdToUrl(examId: string | undefined): void {
    const nextQuery = { ...route.query }
    if (examId) {
      nextQuery.examId = examId
    } else {
      delete nextQuery.examId
    }
    void router.replace({ query: nextQuery })
  }

  function onExamChange(
    value: SelectValue,
    _option?: DefaultOptionType | DefaultOptionType[],
  ): void {
    const examId = value != null ? String(value) : undefined
    selectedExamId.value = examId
    if (syncUrl) {
      writeExamIdToUrl(examId)
    }
  }

  function formatAcademicTerm(exam: ExamSummaryVO): string {
    return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
  }

  function formatExamOptionLabel(exam: ExamSummaryVO): string {
    if (!exam.examNo) {
      throw new Error(`考试列表缺少考试编号：examId=${exam.examId}`)
    }
    return `${exam.examName} (${exam.examNo})`
  }

  /** 便捷入口：加载考试列表（供 onMounted 调用） */
  async function init(): Promise<void> {
    await loadExams()
  }

  return {
    exams,
    examOptions,
    loading,
    selectedExamId,
    selectedExam,
    selectedExamLabel,
    isAdminView,
    loadExams,
    onExamChange,
    init,
  }
}
