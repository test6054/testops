import type { Ref } from 'vue'
import type { QuestionMarkingGroupQuestionVO } from '@/apis/mark/marking-organization'
import type { WholeQuestionForm } from '@/composables/useWholePaperGallery'
import { onBeforeUnmount, onMounted } from 'vue'
import { isGradingEnterInputTarget, isGradingKeyboardInputTarget } from '@/utils/grading-keyboard'

export interface UseMarkingKeyboardOptions {
  submitting: Ref<boolean>
  canSubmit: Ref<boolean>
  isReadOnly: Ref<boolean>
  usesWholePaperWorkspace: Ref<boolean>
  form: { score?: number }
  questionView: Ref<{ fullScore?: number } | null>
  prevTaskId: Ref<string>
  nextTaskId: Ref<string>
  currentWholePageIndex: Ref<number>
  expandedWholeQuestionKey: Ref<string>
  wholeQuestions: Ref<QuestionMarkingGroupQuestionVO[]>
  getWholeQuestionForm: (layoutQuestionId: string) => WholeQuestionForm
  goToTask: (targetTaskId: string) => void
  submit: () => Promise<void>
  scrollToWholePage: (index: number) => void
  applyQuickScore: (score: number) => void
  onWithdraw?: () => void
  applyModalOpen?: Ref<boolean>
  onApplyModalKey?: (event: KeyboardEvent) => void
}

export function useMarkingKeyboard(options: UseMarkingKeyboardOptions) {
  function resolveActiveWholeQuestion(): QuestionMarkingGroupQuestionVO | null {
    const key = options.expandedWholeQuestionKey.value
    if (!key) return options.wholeQuestions.value[0] ?? null
    return options.wholeQuestions.value.find((q) => q.layoutQuestionId === key) ?? null
  }

  function handleWorkspaceKeydown(event: KeyboardEvent): void {
    if (options.applyModalOpen?.value && options.onApplyModalKey) {
      options.onApplyModalKey(event)
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      options.onWithdraw?.()
      return
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
    if (event.key === 'Enter') {
      if (
        options.submitting.value
        || !options.canSubmit.value
        || isGradingEnterInputTarget(event.target)
      ) {
        return
}
      event.preventDefault()
      void options.submit()
      return
    }
    if (isGradingKeyboardInputTarget(event.target)) {
      return
    }
    const key = event.key.toLowerCase()
    if (key === 'j' || event.key === 'ArrowLeft') {
      if (options.prevTaskId.value) {
        event.preventDefault()
        options.goToTask(options.prevTaskId.value)
      }
      return
    }
    if (key === 'k' || event.key === 'ArrowRight') {
      if (options.nextTaskId.value) {
        event.preventDefault()
        options.goToTask(options.nextTaskId.value)
      }
      return
    }
    if (/^\d$/.test(event.key) && options.canSubmit.value && !options.isReadOnly.value) {
      const digit = Number(event.key)
      if (options.usesWholePaperWorkspace.value) {
        const question = resolveActiveWholeQuestion()
        if (question && digit <= question.fullScore) {
          event.preventDefault()
          options.getWholeQuestionForm(question.layoutQuestionId).score = digit
        }
        return
      }
      const fullScore = options.questionView.value?.fullScore
      if (fullScore != null && digit <= fullScore) {
        event.preventDefault()
        options.applyQuickScore(digit)
      }
      return
    }
    if (event.key === 'PageDown' && options.usesWholePaperWorkspace.value) {
      event.preventDefault()
      options.scrollToWholePage(options.currentWholePageIndex.value + 1)
      return
    }
    if (event.key === 'PageUp' && options.usesWholePaperWorkspace.value) {
      event.preventDefault()
      options.scrollToWholePage(options.currentWholePageIndex.value - 1)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleWorkspaceKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleWorkspaceKeydown)
  })
}
