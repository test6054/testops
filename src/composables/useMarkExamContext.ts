import type { InjectionKey } from 'vue'
import type { MarkExamSelectorOptions } from '@/composables/useMarkExamSelector'
import type { ExamSummaryVO } from '@/apis/mark/exam'
import type { MarkExamSelectOption } from '@/utils/mark-exam-option'
import { computed, inject, provide, ref, watch } from 'vue'
import { getExamDetail } from '@/apis/mark/exam'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError } from '@/utils/error-handler'
import { examSummaryFromDetail, toMarkExamSelectOption } from '@/utils/mark-exam-option'

export type MarkExamContext = ReturnType<typeof useMarkExamSelector>

const MARK_EXAM_CONTEXT_KEY: InjectionKey<MarkExamContext> = Symbol('markExamContext')

function createWorkbenchExamAdapter(): MarkExamContext {
  const workbench = inject(MARK_WORKBENCH_CONTEXT_KEY)
  if (!workbench) {
    throw new Error('工作台考试上下文未注入')
  }
  const markStageStore = useMarkStageStore()
  const selectedExamId = workbench.selectedExamId
  const currentExam = ref<ExamSummaryVO | null>(null)

  /** 工作台子页不显示考试选择器，但仍需真实考试详情支撑所有权判断。 */
  async function loadCurrentExamDetail(examId: string | undefined): Promise<void> {
    if (!examId) {
      currentExam.value = null
      return
    }
    try {
      currentExam.value = examSummaryFromDetail(await getExamDetail(examId))
    } catch (error) {
      currentExam.value = null
      showUserError(error, '当前考试不存在或无权访问')
    }
  }

  watch(selectedExamId, (examId) => {
    void loadCurrentExamDetail(examId)
  }, { immediate: true })

  return {
    exams: ref<ExamSummaryVO[]>([]),
    examOptions: computed<MarkExamSelectOption[]>(() =>
      currentExam.value ? [toMarkExamSelectOption(currentExam.value)] : [],
    ),
    loading: workbench.loading,
    searching: ref(false),
    resolvingPinned: ref(false),
    selectedExamId,
    selectedExamSelectValue: computed(() => selectedExamId.value || undefined),
    selectedExam: computed<ExamSummaryVO | null>(() => currentExam.value),
    selectedExamLabel: computed(() => {
      if (markStageStore.selectedExamLabel) {
        return markStageStore.selectedExamLabel
      }
      if (!currentExam.value) {
        return ''
      }
      return currentExam.value.examNo
        ? `${currentExam.value.examName}（${currentExam.value.examNo}）`
        : currentExam.value.examName
    }),
    isAdminView: computed(() => false),
    loadExams: async () => {},
    searchExams: async () => {},
    onExamSearch: () => {},
    onExamChange: () => {},
    syncPinnedExam: loadCurrentExamDetail,
    init: async () => {
      await loadCurrentExamDetail(selectedExamId.value)
    },
  }
}

/**
 * 在页面 setup 顶层注入考试上下文，供子组件共享同一选择器实例。
 */
export function provideMarkExamContext(options?: MarkExamSelectorOptions): MarkExamContext {
  const context = useMarkExamSelector(options)
  provide(MARK_EXAM_CONTEXT_KEY, context)
  return context
}

/**
 * 读取考试上下文：工作台子页优先使用 layout 注入的 examId。
 */
export function useMarkExamContext(options?: MarkExamSelectorOptions): MarkExamContext {
  const workbench = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  if (workbench) {
    return createWorkbenchExamAdapter()
  }
  const injected = inject(MARK_EXAM_CONTEXT_KEY, null)
  if (injected) {
    return injected
  }
  return useMarkExamSelector(options)
}
