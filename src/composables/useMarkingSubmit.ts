import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { Ref } from 'vue'
import type {
  MarkingPageAnnotationSubmitItem,
  MarkingQuestionScoreSubmitItem,
  MarkingQuestionViewResponse,
  MarkingTaskResponse,
  QuestionMarkingGroupQuestionResponse,
} from '@/apis/mark/marking-organization'
import type { WholeQuestionForm } from '@/composables/useWholePaperGallery'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  batchSubmitMarkingTasksInChunks,
  MarkingTaskBatchOutcomeCode,
  precheckMarkingTaskBatch,
} from '@/apis/mark/marking-batch'
import { MarkingTaskStatusCode, submitMarkingTask } from '@/apis/mark/marking-organization'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildGradingDraftKey,
  onGradingDraftSubmitStart,
  onGradingDraftSubmitSuccess,
  scheduleGradingDraftSave,
} from '@/composables/useGradingDraftPersist'
import { useMarkingRecentSubmit } from '@/composables/useMarkingRecentSubmit'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useTenantMarkingWithdrawPolicy } from '@/composables/useTenantMarkingWithdrawPolicy'
import { getUserErrorMessage, showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  isMultiResponseSliceConflict,
  MarkingConflictHint,
  messageIncludesConflictHint,
} from '@/utils/marking-workflow-conflict'

export interface UseMarkingSubmitOptions {
  taskId: Ref<string>
  task: Ref<MarkingTaskResponse | null>
  batchTasks: Ref<MarkingTaskResponse[]>
  questionView: Ref<MarkingQuestionViewResponse | null>
  usesWholePaperWorkspace: Ref<boolean>
  isWholePaperTask: Ref<boolean>
  isReadOnly: Ref<boolean>
  canSubmit: Ref<boolean>
  nextTaskId: Ref<string>
  goToTask: (targetTaskId: string) => void
  loadTask: () => Promise<void>
  ensureBatchLoaded: (examId: string) => Promise<void>
  tenantId: Ref<string>
  form: { score?: number, annotationNote?: string }
  wholeQuestions: Ref<QuestionMarkingGroupQuestionResponse[]>
  getWholeQuestionForm: (layoutQuestionId: string) => WholeQuestionForm
  wholePageAnnotationForms: Record<string, string>
  buildWholePaperSubmitRequest: () => {
    questionScores: MarkingQuestionScoreSubmitItem[]
    pageAnnotations: MarkingPageAnnotationSubmitItem[]
  } | null
  onSubmitSuccess?: (payload: { taskId: string, score: number }) => void
}

export function useMarkingSubmit(options: UseMarkingSubmitOptions) {
  const router = useRouter()
  const { refreshSnapshot } = useWorkspaceExamId()
  const { recordSubmit } = useMarkingRecentSubmit()
  const { requireWithdrawWindowMinutes } = useTenantMarkingWithdrawPolicy()
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const applyModalOpen = ref(false)
  const applyModalCountdown = ref(0)
  const batchApplying = ref(false)
  const batchApplyProgress = ref({ done: 0, total: 0 })

  const submittedScoreSnapshot = ref<number | undefined>(undefined)
  const remainingSameQuestionCount = ref(0)
  const pendingBatchTaskIds = ref<string[]>([])
  const pendingBatchLayoutQuestionId = ref('')
  const pendingBatchGroupId = ref('')
  const pendingBatchFullScore = ref(0)

  function promptMultiResponseSliceConflict(examId: string, detail: string): void {
    void confirmAsync({
      title: '无法提交给分',
      content: `${detail}。请先到扫描监控清理重复作答切片后再提交。`,
      okText: '前往扫描监控',
      type: 'warning',
      onOk: () => {
        void router.push({
          name: 'TeacherExamWorkspaceScanMonitor',
          params: { examId },
        })
      },
    })
  }

  function handleSubmitFailure(error: unknown, examId: string, fallback: string): void {
    if (isMultiResponseSliceConflict(error)) {
      promptMultiResponseSliceConflict(examId, getUserErrorMessage(error, fallback))
      return
    }
    showUserError(error, fallback)
  }

  const rules: Record<string, Rule[]> = {
    score: [
      { required: true, message: '请填写教师给分', trigger: 'change' },
      {
        validator(_rule, value) {
          if (value === undefined || value === null) return Promise.resolve()
          if (Number(value) < 0) return Promise.reject(new Error('给分不能为负'))
          const fullScore = options.questionView.value?.fullScore
          if (fullScore != null && Number(value) > fullScore) {
            return Promise.reject(new Error(`给分不能超过满分 ${fullScore}`))
          }
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

  function buildQuestionSubmitRequest(): MarkingQuestionScoreSubmitItem | null {
    if (!options.questionView.value) {
      showFormValidationMessage('题目视图未加载')
      return null
    }
    if (options.form.score === undefined) {
      showFormValidationMessage('请填写教师给分')
      return null
    }
    return {
      layoutQuestionId: options.questionView.value.layoutQuestionId,
      score: options.form.score,
      annotationText: options.form.annotationNote?.trim() || undefined,
      correlationId: createCorrelationId('question', options.questionView.value.layoutQuestionId),
    }
  }

  function resolveSubmittedScore(submitRequest: {
    questionScores: MarkingQuestionScoreSubmitItem[]
    pageAnnotations: MarkingPageAnnotationSubmitItem[]
  }): number | null {
    const firstScore = submitRequest.questionScores[0]?.score
    if (firstScore === undefined) {
      showFormValidationMessage('提交给分缺失')
      return null
    }
    return firstScore
  }

  function resolveSameQuestionRemainingTasks(
    currentTask: MarkingTaskResponse,
  ): MarkingTaskResponse[] {
    if (currentTask.taskUnit === 'WHOLE_PAPER') {
      return []
    }
    const layoutQuestionId = options.questionView.value?.layoutQuestionId
    if (!layoutQuestionId) {
      return []
    }
    return options.batchTasks.value.filter((item) => {
      if (item.id === currentTask.id) return false
      if (
        item.taskStatus !== MarkingTaskStatusCode.ALLOCATED
        && item.taskStatus !== MarkingTaskStatusCode.IN_PROGRESS
      ) {
        return false
      }
      if (item.groupId !== currentTask.groupId) return false
      if (item.taskUnit === 'WHOLE_PAPER') return false
      return item.questionNo === currentTask.questionNo
    })
  }

  function buildDraftPayload() {
    const wholeQuestionForms: Record<string, { score?: number, annotationText: string }> = {}
    for (const question of options.wholeQuestions.value) {
      const qForm = options.getWholeQuestionForm(question.layoutQuestionId)
      if (qForm.score !== undefined || qForm.annotationText.trim()) {
        wholeQuestionForms[question.layoutQuestionId] = {
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
    if (batchApplying.value) {
      return
    }
    // MVR-413：与 canSubmit / isScoreReadOnly / BE requireActiveExam 二次闸，禁止关考后批量应用假可写
    if (options.isReadOnly.value || !options.canSubmit.value) {
      showFormValidationMessage(
        options.isReadOnly.value ? '当前不可给分（已定稿/已回收或考试已关闭）' : '当前任务状态不可提交给分',
      )
      closeApplyModal()
      return
    }
    const currentTask = options.task.value
    const score = submittedScoreSnapshot.value
    const layoutQuestionId
      = pendingBatchLayoutQuestionId.value || options.questionView.value?.layoutQuestionId
    if (!currentTask?.examId || !currentTask.groupId || score === undefined || !layoutQuestionId) {
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
        layoutQuestionId,
        score,
        annotationText: options.form.annotationNote?.trim() || undefined,
        correlationId: createCorrelationId('question', layoutQuestionId),
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
      const submittedTaskIds = results.flatMap((item) => item.submittedTaskIds ?? [])
      const failed = results.find((item) => item.outcome === MarkingTaskBatchOutcomeCode.FAILED)
      if (submittedTaskIds.length > 0) {
        const withdrawWindowMinutes = requireWithdrawWindowMinutes()
        if (withdrawWindowMinutes != null) {
          for (const submittedTaskId of submittedTaskIds) {
            recordSubmit({
              taskId: submittedTaskId,
              examId: currentTask.examId,
              groupId: currentTask.groupId,
              score,
              withdrawWindowMinutes,
            })
          }
        }
        await refreshSnapshot()
        await options.loadTask()
      }
      if (failed) {
        const failureMessage = failed.failureMessage ?? '批量提交失败'
        if (messageIncludesConflictHint(failureMessage, MarkingConflictHint.MULTI_RESPONSE_SLICE)) {
          promptMultiResponseSliceConflict(currentTask.examId, failureMessage)
          return
        }
        message.error(
          submittedTaskIds.length > 0
            ? `${failureMessage}（已成功提交 ${submittedTaskIds.length} 份，请处理剩余任务）`
            : failureMessage,
        )
        return
      }
      const warn = results.find((item) => item.outcome === MarkingTaskBatchOutcomeCode.WARN)
      if (warn?.annotationWarning) {
        message.warning(warn.annotationWarning)
      } else {
        message.success(`已将 ${submittedTaskIds.length} 份同类卷应用 ${score} 分`)
      }
    } catch (error) {
      handleSubmitFailure(error, currentTask.examId, '批量应用给分失败')
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
    currentTask: MarkingTaskResponse,
    score: number,
    remainingTasks: MarkingTaskResponse[],
  ): void {
    if (remainingTasks.length === 0 || !options.questionView.value?.layoutQuestionId) {
      continueAfterSubmit()
      return
    }
    submittedScoreSnapshot.value = score
    remainingSameQuestionCount.value = remainingTasks.length
    pendingBatchTaskIds.value = remainingTasks.map((item) => item.id)
    pendingBatchLayoutQuestionId.value = options.questionView.value.layoutQuestionId
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
          `阅卷任务已提交，已切换到${options.isWholePaperTask.value ? '下一未阅份' : '下一未阅'}`,
        )
        options.goToTask(options.nextTaskId.value)
      }
      return
    }
    message.success(
      `阅卷任务已提交，当前批次无更多未阅，已停在最后${options.isWholePaperTask.value ? '一份' : '一题'}`,
    )
    void options.loadTask()
  }

  async function submit(): Promise<void> {
    if (submitting.value) {
      return
    }
    // MVR-413：handler 二次闸，与 canSubmit / isScoreReadOnly / BE requireActiveExam 同源；
    // 覆盖 AI 采纳、整卷末题 Enter、键盘 Enter 等非按钮入口，禁止仅靠 disabled 拦截。
    if (options.isReadOnly.value || !options.canSubmit.value) {
      showFormValidationMessage(
        options.isReadOnly.value ? '当前不可给分（已定稿/已回收或考试已关闭）' : '当前任务状态不可提交给分',
      )
      return
    }
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
        : (() => {
            const questionScore = buildQuestionSubmitRequest()
            if (!questionScore) {
              return null
            }
            return {
              questionScores: [questionScore],
              pageAnnotations: [],
            }
          })()
      if (!submitRequest) {
        return
      }
      await submitMarkingTask({ taskId: options.taskId.value, ...submitRequest })
      if (draftKey) {
        await onGradingDraftSubmitSuccess(draftKey)
      }
      const score = resolveSubmittedScore(submitRequest)
      if (score === null) {
        return
      }
      const withdrawWindowMinutes = requireWithdrawWindowMinutes()
      if (withdrawWindowMinutes != null) {
        recordSubmit({
          taskId: currentTask.id,
          examId: currentTask.examId,
          groupId: currentTask.groupId ?? null,
          score,
          withdrawWindowMinutes,
          batchIndex: options.batchTasks.value.findIndex((item) => item.id === currentTask.id) + 1,
          batchTotal: options.batchTasks.value.length,
        })
      }
      options.onSubmitSuccess?.({ taskId: currentTask.id, score })
      await refreshSnapshot()
      await options.ensureBatchLoaded(currentTask.examId)
      const remainingTasks = resolveSameQuestionRemainingTasks(currentTask)
      if (remainingTasks.length > 0 && !options.usesWholePaperWorkspace.value) {
        openApplyModalIfNeeded(currentTask, score, remainingTasks)
        return
      }
      continueAfterSubmit()
    } catch (error) {
      handleSubmitFailure(error, currentTask.examId, '提交阅卷任务失败')
    } finally {
      submitting.value = false
    }
  }

  async function acceptAiScoreAndSubmit(): Promise<void> {
    if (options.questionView.value?.aiScore == null || submitting.value) return
    // MVR-413：与 submit 二次闸同源，避免采纳入口绕过按钮 disabled
    if (options.isReadOnly.value || !options.canSubmit.value) {
      showFormValidationMessage(
        options.isReadOnly.value ? '当前不可给分（已定稿/已回收或考试已关闭）' : '当前任务状态不可提交给分',
      )
      return
    }
    options.form.score = options.questionView.value.aiScore
    await submit()
  }

  const hasGradingDraft = computed(() => {
    if (!options.canSubmit.value || options.isReadOnly.value) {
      return false
    }
    if (options.usesWholePaperWorkspace.value) {
      const hasQuestionDraft = options.wholeQuestions.value.some((question) => {
        const questionForm = options.getWholeQuestionForm(question.layoutQuestionId)
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
