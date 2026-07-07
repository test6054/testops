import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, inject, toValue } from 'vue'
import { EXAM_WORKSPACE_CHROME_KEY, MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'

/** hub：考试名 +「阶段 · #编号」；page：仅页面名（侧栏已承载考试上下文） */
export type ExamJourneyContextBarVariant = 'hub' | 'page'

export interface ExamJourneyContextBarState {
  contextBarTitle: ComputedRef<string>
  contextBarSubtitle: ComputedRef<string>
  examStatusLabel: ComputedRef<string>
  examStatusTone: ComputedRef<BadgeTone | undefined>
  examDetail: ComputedRef<ExamDetailResponse | null>
  examDetailLoading: ComputedRef<boolean>
}

export interface OptionalExamJourneyContextBarState extends ExamJourneyContextBarState {
  /** 是否处于考试工作台旅程壳（可注入 Chrome / 快照） */
  isJourneyChrome: ComputedRef<boolean>
}

function resolveContextBarCopy(
  variant: ExamJourneyContextBarVariant,
  stageLabel: string,
  examName: string,
  examNo: string,
): { title: string, subtitle: string } {
  if (variant === 'hub') {
    return {
      title: examName,
      subtitle: examNo ? `${stageLabel} · #${examNo}` : stageLabel,
    }
  }
  return {
    title: '',
    subtitle: '',
  }
}

/**
 * 旅程子页 ContextBar，对齐 exam-prototype.html L1 子页：
 * - hub（准备工作台/概览）：副标题「阶段 · #编号」+ 标题考试名
 * - page（扫描批次等）：侧栏已承载页面名与考试上下文，ContextBar 仅保留状态标签与操作
 */
export function useExamJourneyContextBar(
  stageLabel: MaybeRefOrGetter<string>,
  variant: ExamJourneyContextBarVariant = 'page',
): ExamJourneyContextBarState {
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  const chrome = inject(EXAM_WORKSPACE_CHROME_KEY, null)
  if (!workbenchContext || !chrome) {
    throw new Error('useExamJourneyContextBar 必须在 exam-workspace-layout 子树内使用')
  }

  const examDetail = computed(() => workbenchContext.examDetail?.value ?? null)
  const examDetailLoading = computed(() => workbenchContext.examDetailLoading?.value ?? false)

  const contextBarTitle = computed(() => {
    const label = toValue(stageLabel)
    const examName = chrome.contextTitle.value || workbenchContext.snapshot.value?.examName || ''
    const examNo = workbenchContext.snapshot.value?.examNo ?? examDetail.value?.examNo ?? ''
    return resolveContextBarCopy(variant, label, examName, examNo).title
  })

  const contextBarSubtitle = computed(() => {
    const label = toValue(stageLabel)
    const examName = chrome.contextTitle.value || workbenchContext.snapshot.value?.examName || ''
    const examNo = workbenchContext.snapshot.value?.examNo ?? examDetail.value?.examNo ?? ''
    return resolveContextBarCopy(variant, label, examName, examNo).subtitle
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
  variant: ExamJourneyContextBarVariant = 'page',
): OptionalExamJourneyContextBarState {
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  const chrome = inject(EXAM_WORKSPACE_CHROME_KEY, null)
  const isJourneyChrome = computed(() => Boolean(workbenchContext && chrome))

  const examDetail = computed(() => workbenchContext?.examDetail?.value ?? null)
  const examDetailLoading = computed(() => workbenchContext?.examDetailLoading?.value ?? false)

  const contextBarTitle = computed(() => {
    const label = toValue(stageLabel)
    if (!isJourneyChrome.value) {
      return variant === 'hub' ? '' : label
    }
    const examName = chrome?.contextTitle.value || workbenchContext?.snapshot.value?.examName || ''
    const examNo = workbenchContext?.snapshot.value?.examNo ?? examDetail.value?.examNo ?? ''
    return resolveContextBarCopy(variant, label, examName, examNo).title
  })

  const contextBarSubtitle = computed(() => {
    const label = toValue(stageLabel)
    if (!isJourneyChrome.value) {
      return variant === 'hub' ? label : ''
    }
    const examName = chrome?.contextTitle.value || workbenchContext?.snapshot.value?.examName || ''
    const examNo = workbenchContext?.snapshot.value?.examNo ?? examDetail.value?.examNo ?? ''
    return resolveContextBarCopy(variant, label, examName, examNo).subtitle
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
