import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { ExamDetailVO } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, inject, toValue } from 'vue'
import {
  EXAM_WORKSPACE_CHROME_KEY,
  MARK_WORKBENCH_CONTEXT_KEY,
} from '@/composables/useMarkWorkbenchContext'

export interface ExamJourneyContextBarState {
  contextBarTitle: ComputedRef<string>
  contextBarSubtitle: ComputedRef<string>
  examStatusLabel: ComputedRef<string>
  examStatusTone: ComputedRef<BadgeTone | undefined>
  examDetail: ComputedRef<ExamDetailVO | null>
  examDetailLoading: ComputedRef<boolean>
}

export interface OptionalExamJourneyContextBarState extends ExamJourneyContextBarState {
  /** 是否处于考试工作台旅程壳（可注入 Chrome / 快照） */
  isJourneyChrome: ComputedRef<boolean>
}

/**
 * 旅程子页 ContextBar：考试名为标题、阶段+编号为副标题，数据同源 exam-workspace-layout Chrome。
 */
export function useExamJourneyContextBar(
  stageLabel: MaybeRefOrGetter<string>,
): ExamJourneyContextBarState {
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  const chrome = inject(EXAM_WORKSPACE_CHROME_KEY, null)
  if (!workbenchContext || !chrome) {
    throw new Error('useExamJourneyContextBar 必须在 exam-workspace-layout 子树内使用')
  }

  const examDetail = computed(() => workbenchContext.examDetail?.value ?? null)
  const examDetailLoading = computed(() => workbenchContext.examDetailLoading?.value ?? false)

  const contextBarTitle = computed(
    () => chrome.contextTitle.value || workbenchContext.snapshot.value?.examName || '',
  )

  const contextBarSubtitle = computed(() => {
    const examNo = workbenchContext.snapshot.value?.examNo ?? examDetail.value?.examNo
    const label = toValue(stageLabel)
    return examNo ? `${label} · ${examNo}` : label
  })

  const examStatusLabel = computed(() => chrome.examStatusLabel.value)
  const examStatusTone = computed(() => chrome.examStatusTone.value)

  return {
    contextBarTitle,
    contextBarSubtitle,
    examStatusLabel,
    examStatusTone,
    examDetail,
    examDetailLoading,
  }
}

/**
 * 可选旅程 ContextBar：L0 管理页无注入时降级为阶段文案，工作台子页与 layout Chrome 同源。
 */
export function useOptionalExamJourneyContextBar(
  stageLabel: MaybeRefOrGetter<string>,
): OptionalExamJourneyContextBarState {
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  const chrome = inject(EXAM_WORKSPACE_CHROME_KEY, null)
  const isJourneyChrome = computed(() => Boolean(workbenchContext && chrome))

  const examDetail = computed(() => workbenchContext?.examDetail?.value ?? null)
  const examDetailLoading = computed(() => workbenchContext?.examDetailLoading?.value ?? false)

  const contextBarTitle = computed(() => {
    if (!chrome) {
      return ''
    }
    return chrome.contextTitle.value || workbenchContext?.snapshot.value?.examName || ''
  })

  const contextBarSubtitle = computed(() => {
    const label = toValue(stageLabel)
    if (!isJourneyChrome.value) {
      return label
    }
    const examNo = workbenchContext?.snapshot.value?.examNo ?? examDetail.value?.examNo
    return examNo ? `${label} · ${examNo}` : label
  })

  const examStatusLabel = computed(() => chrome?.examStatusLabel.value ?? '')
  const examStatusTone = computed(() => chrome?.examStatusTone.value)

  return {
    isJourneyChrome,
    contextBarTitle,
    contextBarSubtitle,
    examStatusLabel,
    examStatusTone,
    examDetail,
    examDetailLoading,
  }
}
