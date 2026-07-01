import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { Ref } from 'vue'
import type {
  MarkingPageAnnotationSubmitItem,
  MarkingQuestionScoreSubmitItem,
  MarkingQuestionViewVO,
  MarkingTaskVO,
  QuestionMarkingGroupQuestionVO,
} from '@/apis/mark/marking-organization'
import type { WholeQuestionForm } from '@/composables/useWholePaperGallery'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import {
  batchSubmitMarkingTasksInChunks,
  precheckMarkingTaskBatch,
} from '@/apis/mark/marking-batch'
import { submitMarkingTask } from '@/apis/mark/marking-organization'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildGradingDraftKey,
  onGradingDraftSubmitStart,
  onGradingDraftSubmitSuccess,
  scheduleGradingDraftSave,
} from '@/composables/useGradingDraftPersist'
import { useMarkingRecentSubmit } from '@/composables/useMarkingRecentSubmit'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'

export interface UseMarkingSubmitOptions {
  taskId: Ref<string>
  task: Ref<MarkingTaskVO | null>
  batchTasks: Ref<MarkingTaskVO[]>
  questionView: Ref<MarkingQuestionViewVO | null>
  usesWholePaperWorkspace: Ref<boolean>
  isWholePaperTask: Ref<boolean>
  isReadOnly: Ref<boolean>
  canSubmit: Ref<boolean>
  nextTaskId: Ref<string>
  goToTask: (targetTaskId: string) => void
  loadTask: () => Promise<void>
  tenantId: Ref<string>
  form: { score?: number, annotationNote?: string }
  wholeQuestions: Ref<QuestionMarkingGroupQuestionVO[]>
  getWholeQuestionForm: (questionTemplateId: string) => WholeQuestionForm
  wholePageAnnotationForms: Record<string, string>
  buildWholePaperSubmitRequest: () => {
    questionScores: MarkingQuestionScoreSubmitItem[]
    pageAnnotations: MarkingPageAnnotationSubmitItem[]
  }
  onSubmitSuccess?: (payload: { taskId: string, score: number }) => void
}

export function useMarkingSubmit(options: UseMarkingSubmitOptions) {
  const { refreshSnapshot } = useWorkspaceExamId()
  const { recordSubmit } = useMarkingRecentSubmit()
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const applyModalOpen = ref(false)
  const applyModalCountdown = ref(0)
  const batchApplying = ref(false)
  const batchApplyProgress = ref({ done: 0, total: 0 })

  const submittedScoreSnapshot = ref<number | undefined>(undefined)
  const remainingSameQuestionCount = ref(0)
  const pendingBatchTaskIds = ref<string[]>([])
  const pendingBatchQuestionTemplateId = ref('')
  const pendingBatchGroupId = ref('')
  const pendingBatchFullScore = ref(0)

  const rules: Record<string, Rule[]> = {
    score: [
      { required: true, message: '请填写教师给分', trigger: 'change' },
      {
        validator(_rule, value) {
          if (value === undefined || value === null) return Promise.resolve()
          if (Number(value) < 0) return Promise.reject(new Error('给分不能为负'))
          return Promise.resolve()
        },
        trigger: 'change',
      },
    ],
    annotationNote: [{ max: 1000, message: '批注最多 1000 字', trigger: 'blur' }],
  }

  function createCorrelationId(scope: 'question' | 'page', id: string): string {
    return `${scope}-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  function buildQuestionSubmitRequest(): MarkingQuestionScoreSubmitItem {
    if (!options.questionView.value) {
      throw new Error('题目视图未加载，请刷新后重试')
    }
    if (options.form.score === undefined) {
      throw new Error('请填写教师给分')
    }
    return {
      questionTemplateId: options.questionView.value.questionTemplateId,
      score: options.form.score,
      annotationText: options.form.annotationNote?.trim() || undefined,
      correlationId: createCorrelationId('question', options.questionView.value.questionTemplateId),
    }
  }

  function resolveSubmittedScore(submitRequest: {
    questionScores: MarkingQuestionScoreSubmitItem[]
    pageAnnotations: MarkingPageAnnotationSubmitItem[]
  }): number {
    const firstScore = submitRequest.questionScores[0]?.score
    if (firstScore === undefined) {
      throw new Error('提交给分缺失')
    }
    return firstScore
  }

  function resolveSameQuestionRemainingTasks(currentTask: MarkingTaskVO): MarkingTaskVO[] {
    if (currentTask.taskUnit === 'WHOLE_PAPER') {
      return []
    }
    const questionTemplateId = options.questionView.value?.questionTemplateId
    if (!questionTemplateId) {
      return []
    }
    return options.batchTasks.value.filter((item) => {
      if (item.id === currentTask.id) return false
      if (item.taskStatus !== 'ALLOCATED' && item.taskStatus !== 'IN_PROGRESS') return false
      if (item.groupId !== currentTask.groupId) return false
      if (item.taskUnit === 'WHOLE_PAPER') return false
      if (item.questionNo !== currentTask.questionNo) return false
      return true
    })
  }

  function buildDraftPayload() {
    const wholeQuestionForms: Record<string, { score?: number, annotationText: string }> = {}
    for (const question of options.wholeQuestions.value) {
      const qForm = options.getWholeQuestionForm(question.questionTemplateId)
      if (qForm.score !== undefined || qForm.annotationText.trim()) {
        wholeQuestionForms[question.questionTemplateId] = {
          score: qForm.score,
          annotationText: qForm.annotationText,
        }
      }
    }
    return {
      score: options.form.score,
      annotationNote: options.form.annotationNote,
      wholeQuestionForms:
        Object.keys(wholeQuestionForms).length > 0 ? wholeQuestionForms : undefined,
      wholePageAnnotationForms: { ...options.wholePageAnnotationForms },
      updatedAt: Date.now(),
    }
  }

  function persistDraftIfNeeded(): void {
    const currentTask = options.task.value
    if (!currentTask || !options.canSubmit.value || options.isReadOnly.value) return
    const tenantId = options.tenantId.value
    if (!tenantId) return
    const key = buildGradingDraftKey(tenantId, currentTask.examId, currentTask.id)
    scheduleGradingDraftSave(key, buildDraftPayload())
  }

  function closeApplyModal(): void {
    applyModalOpen.value = false
    applyModalCountdown.value = 0
  }

  async function confirmExtremeBatchScore(
    score: number,
    count: number,
    fullScore: number,
  ): Promise<boolean> {
    if (score !== 0 && score !== fullScore) return true
    const isZero = score === 0
    return confirmAsync({
      title: isZero ? '确认批量零分？' : '确认批量满分？',
      content: isZero
        ? `将对剩余 ${count} 份同类卷统一给 0 分。`
        : `将对剩余 ${count} 份同类卷统一给满分 ${fullScore} 分。`,
      type: 'warning',
      okText: '确认应用',
      cancelText: '取消',
    })
  }

  async function applyScoreToRemaining(): Promise<void> {
    const currentTask = options.task.value
    const score = submittedScoreSnapshot.value
    const questionTemplateId
      = pendingBatchQuestionTemplateId.value || options.questionView.value?.questionTemplateId
    if (
      !currentTask?.examId
      || !currentTask.groupId
      || score === undefined
      || !questionTemplateId
    ) {
      closeApplyModal()
      return
    }
    const taskIds = pendingBatchTaskIds.value
    if (taskIds.length === 0) {
      closeApplyModal()
      return
    }

    const confirmed = await confirmExtremeBatchScore(
      score,
      taskIds.length,
      pendingBatchFullScore.value,
    )
    if (!confirmed) return

    closeApplyModal()
    batchApplying.value = true
    batchApplyProgress.value = { done: 0, total: taskIds.length }

    const questionScores: MarkingQuestionScoreSubmitItem[] = [
      {
        questionTemplateId,
        score,
        annotationText: options.form.annotationNote?.trim() || undefined,
        correlationId: createCorrelationId('question', questionTemplateId),
      },
    ]

    const baseRequest = {
      examId: currentTask.examId,
      groupId: currentTask.groupId,
      questionScores,
    }

    try {
      const precheck = await precheckMarkingTaskBatch({ ...baseRequest, taskIds })
      if (!precheck.passed) {
        message.error(precheck.blockingReason ?? '批量预检未通过')
        return
      }
      const results = await batchSubmitMarkingTasksInChunks(baseRequest, taskIds, (done, total) => {
        batchApplyProgress.value = { done, total }
      })
      const failed = results.find((item) => item.outcome === 'FAILED')
      if (failed) {
        message.error(failed.failureMessage ?? '批量提交失败')
        return
      }
      const warn = results.find((item) => item.outcome === 'WARN')
      if (warn?.annotationWarning) {
        message.warning(warn.annotationWarning)
      } else {
        message.success(`已将 ${taskIds.length} 份同类卷应用 ${score} 分`)
      }
      for (const submittedTaskId of taskIds) {
        recordSubmit({
          taskId: submittedTaskId,
          examId: currentTask.examId,
          groupId: currentTask.groupId,
          score,
        })
      }
      await refreshSnapshot()
    } catch (error) {
      showUserError(error, '批量应用给分失败')
    } finally {
      batchApplying.value = false
    }
  }

  function dismissApplyModalAndContinue(): void {
    closeApplyModal()
    if (!options.nextTaskId.value) {
      void options.loadTask()
    }
  }

  function handleApplyModalKey(event: KeyboardEvent): void {
    if (!applyModalOpen.value || event.metaKey || event.ctrlKey || event.altKey) return
    const key = event.key.toLowerCase()
    if (key === 'y') {
      event.preventDefault()
      void applyScoreToRemaining()
      return
    }
    if (key === 'n') {
      event.preventDefault()
      dismissApplyModalAndContinue()
    }
  }

  function openApplyModalIfNeeded(
    currentTask: MarkingTaskVO,
    score: number,
    remainingTasks: MarkingTaskVO[],
  ): void {
    if (remainingTasks.length === 0 || !options.questionView.value?.questionTemplateId) {
      continueAfterSubmit()
      return
    }
    submittedScoreSnapshot.value = score
    remainingSameQuestionCount.value = remainingTasks.length
    pendingBatchTaskIds.value = remainingTasks.map((item) => item.id)
    pendingBatchQuestionTemplateId.value = options.questionView.value.questionTemplateId
    pendingBatchGroupId.value = currentTask.groupId ?? ''
    pendingBatchFullScore.value = options.questionView.value.fullScore
    applyModalOpen.value = true
    if (options.nextTaskId.value) {
      options.goToTask(options.nextTaskId.value)
    }
  }

  function continueAfterSubmit(): void {
    if (options.nextTaskId.value) {
      if (!applyModalOpen.value) {
        message.success(
          `阅卷任务已提交，已切换到${options.isWholePaperTask.value ? '下一份' : '下一题'}`,
        )
        options.goToTask(options.nextTaskId.value)
      }
      return
    }
    message.success(
      `阅卷任务已提交，当前批次已到最后${options.isWholePaperTask.value ? '一份' : '一题'}`,
    )
    void options.loadTask()
  }

  async function submit(): Promise<void> {
    if (!options.taskId.value || !options.task.value || !formRef.value) return
    if (!options.usesWholePaperWorkspace.value) {
      try {
        await formRef.value.validate()
      } catch {
        return
      }
    }
    onGradingDraftSubmitStart()
    submitting.value = true
    const currentTask = options.task.value
    const draftKey
      = options.tenantId.value && currentTask
        ? buildGradingDraftKey(options.tenantId.value, currentTask.examId, currentTask.id)
        : null
    try {
      const submitRequest = options.usesWholePaperWorkspace.value
        ? options.buildWholePaperSubmitRequest()
        : {
            questionScores: [buildQuestionSubmitRequest()],
            pageAnnotations: [],
          }
      await submitMarkingTask({ taskId: options.taskId.value, ...submitRequest })
      if (draftKey) {
        await onGradingDraftSubmitSuccess(draftKey)
      }
      const score = resolveSubmittedScore(submitRequest)
      recordSubmit({
        taskId: currentTask.id,
        examId: currentTask.examId,
        groupId: currentTask.groupId ?? null,
        score,
        batchIndex: options.batchTasks.value.findIndex((item) => item.id === currentTask.id) + 1,
        batchTotal: options.batchTasks.value.length,
      })
      options.onSubmitSuccess?.({ taskId: currentTask.id, score })
      await refreshSnapshot()
      const remainingTasks = resolveSameQuestionRemainingTasks(currentTask)
      if (remainingTasks.length > 0 && !options.usesWholePaperWorkspace.value) {
        openApplyModalIfNeeded(currentTask, score, remainingTasks)
        return
      }
      continueAfterSubmit()
    } catch (error) {
      showUserError(error, '提交阅卷任务失败')
    } finally {
      submitting.value = false
    }
  }

  async function acceptAiScoreAndSubmit(): Promise<void> {
    if (options.questionView.value?.aiScore == null || submitting.value) return
    options.form.score = options.questionView.value.aiScore
    await submit()
  }

  const hasGradingDraft = computed(() => {
    if (!options.canSubmit.value || options.isReadOnly.value) {
      return false
    }
    if (options.usesWholePaperWorkspace.value) {
      const hasQuestionDraft = options.wholeQuestions.value.some((question) => {
        const questionForm = options.getWholeQuestionForm(question.questionTemplateId)
        return (
          (questionForm.score !== undefined && questionForm.score !== null)
          || (questionForm.annotationText?.trim() ?? '') !== ''
        )
      })
      if (hasQuestionDraft) return true
      return Object.values(options.wholePageAnnotationForms).some((text) => text.trim() !== '')
    }
    return options.form.score !== undefined || (options.form.annotationNote?.trim() ?? '') !== ''
  })

  return {
    formRef,
    submitting,
    rules,
    submit,
    acceptAiScoreAndSubmit,
    hasGradingDraft,
    persistDraftIfNeeded,
    buildDraftPayload,
    applyModalOpen,
    applyModalCountdown,
    remainingSameQuestionCount,
    submittedScoreSnapshot,
    batchApplying,
    batchApplyProgress,
    applyScoreToRemaining,
    dismissApplyModalAndContinue,
    handleApplyModalKey,
  }
}
