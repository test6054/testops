import type { OperationLogResponse } from '@/apis/mark/admin-audit'
import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type {
  AiAbilityCode,
  AiExecutionStatusCode,
  ExamQuestionAiExecutionItemResponse,
} from '@/apis/mark/exam-grade'
import type { QualityDecisionCode } from '@/apis/mark/exam-scan'
import type { PaperInstanceDisplayVO } from '@/apis/mark/exam-score'
import type { MarkAiReferenceExperienceAuditResponse } from '@/apis/mark/grading-experience-assist'
import type {
  AnonymousRevealResponse,
  MarkingQuestionViewResponse,
  MarkingTaskResponse,
  MarkingTaskSubmittedQuestionScoreResponse,
  QuestionMarkingGroupQuestionResponse,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { GradingExperienceReferenceMatchModeCode } from '@/types/enums/grading-experience-reference-match-mode-enum'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { listOperationLogs } from '@/apis/mark/admin-audit'
import { AnonymityModeDescription } from '@/apis/mark/anonymity-mode'
import { getExamDetail } from '@/apis/mark/exam'
import { listAnnotations } from '@/apis/mark/exam-annotation'
import {
  AI_ABILITY_TONE,
  AI_EXECUTION_STATUS_TONE,
  AiAbilityDescription,
  AiExecutionStatusDescription,
  listAiExecutionsForQuestion,
  rescoreQuestionByAi,
} from '@/apis/mark/exam-grade'
import { QUALITY_DECISION_TONE, QualityDecisionDescription } from '@/apis/mark/exam-scan'
import {
  AllocationUnitCode,
  AllocationUnitDescription,
  getMarkingQuestionView,
  getMarkingTaskDetail,
  MARKING_TASK_STATUS_TONE,
  MarkingTaskStatusCode,
  MarkingTaskStatusDescription,
} from '@/apis/mark/marking-organization'
import {
  MarkingTaskStreamEventTypeCode,
  MarkingTaskStreamSubscribeScopeCode,
} from '@/apis/mark/marking-task-stream'
import { MARKING_WITHDRAW_TOAST_MS } from '@/apis/mark/marking-withdraw'
import {
  buildConfidentialWatermarkLines,
  formatExamConfidentialLabel,
  isExamConfidentialFlag,
} from '@/composables/useConfidentialWatermark'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildGradingDraftKey,
  loadGradingDraft,
  offerGradingDraftRestore,
} from '@/composables/useGradingDraftPersist'
import { useMarkingKeyboard } from '@/composables/useMarkingKeyboard'
import { useMarkingRecentSubmit } from '@/composables/useMarkingRecentSubmit'
import { useMarkingSubmit } from '@/composables/useMarkingSubmit'
import { useMarkingTaskNavigation } from '@/composables/useMarkingTaskNavigation'
import { useMarkingTaskStream } from '@/composables/useMarkingTaskStream'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { useTenantMarkingWithdrawPolicy } from '@/composables/useTenantMarkingWithdrawPolicy'
import { useWholePaperGallery } from '@/composables/useWholePaperGallery'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useTenantStore } from '@/stores/modules/tenant'
import { AuditTargetTypeCode } from '@/types/enums/audit-target-type-enum'
import { ExamStatusCode } from '@/types/enums/exam-status-enum'
import { PaperInstanceDisplayModeCode } from '@/types/enums/paper-instance-display-mode-enum'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function taskStatusTone(status: MarkingTaskStatusCode): BadgeTone {
  return strictEnumTone(MARKING_TASK_STATUS_TONE, status, '阅卷任务状态')
}

function taskStatusLabel(status: MarkingTaskStatusCode): string {
  return strictEnumLabel(MarkingTaskStatusDescription, status, '阅卷任务状态')
}

function allocationUnitLabel(unit: AllocationUnitCode): string {
  return strictEnumLabel(AllocationUnitDescription, unit, '批阅任务单元')
}

function anonymityModeLabel(mode: AnonymityModeCode): string {
  return strictEnumLabel(AnonymityModeDescription, mode, '匿名模式')
}

function scanPageQualityLabel(status: QualityDecisionCode): string {
  return strictEnumLabel(QualityDecisionDescription, status, '扫描页质量判定')
}

function scanPageQualityTone(status: QualityDecisionCode): BadgeTone {
  return strictEnumTone(QUALITY_DECISION_TONE, status, '扫描页质量判定')
}

function resolvePaperInstanceId(display: PaperInstanceDisplayVO): string | undefined {
  if (
    display.displayMode === PaperInstanceDisplayModeCode.REAL_NAME
    || display.displayMode === PaperInstanceDisplayModeCode.ANONYMOUS
  ) {
    return display.paperInstanceId
  }
  return undefined
}

export function useMarkingTaskDetailState() {
  const route = useRoute()
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  const tenantStore = useTenantStore()
  const markTaskStore = useMarkTaskStore()
  const { tasks: batchTasks } = storeToRefs(markTaskStore)
  const {
    latestWithdrawable,
    recentList,
    canWithdrawEntry: canWithdrawEntryByWindow,
    withdrawEntry,
    withdrawLatest,
  } = useMarkingRecentSubmit()
  const { withdrawWindowLabel, withdrawConfirmHint } = useTenantMarkingWithdrawPolicy()

  const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
  const tenantId = computed(() => tenantStore.tenantId ?? '')

  const task = ref<MarkingTaskResponse | null>(null)
  const reviewRecords = ref<OperationLogResponse[]>([])
  const reviewRecordsLoading = ref(false)
  const examDetail = ref<ExamDetailResponse | null>(null)
  const loading = ref(false)
  const taskRecycledBlocked = ref(false)
  const sessionPausedAlert = ref(false)
  const withdrawToastVisible = ref(false)
  let withdrawToastTimer: ReturnType<typeof setTimeout> | null = null
  const form = reactive<{ score?: number, annotationNote?: string, reviewSuggestion?: string }>({
    score: undefined,
    annotationNote: '',
    reviewSuggestion: '',
  })

  const isExamConfidential = computed(() => isExamConfidentialFlag(examDetail.value?.confidential))
  const examConfidentialLabel = computed(() => formatExamConfidentialLabel(examDetail.value))
  const examWatermarkLines = computed(() =>
    buildConfidentialWatermarkLines({ examLabel: examConfidentialLabel.value }),
  )
  /** MVR-327：仅认 BE MarkingTaskResponse.canManageOwnerIdentityReveal===true */
  const canManageOwnerIdentityReveal = computed(
    () => task.value?.canManageOwnerIdentityReveal === true,
  )
  const isReadOnly = computed(() => task.value?.taskStatus === MarkingTaskStatusCode.FINALIZED)
  /**
   * MVR-409/410：给分区只读 = 已定稿 ∨ 已回收 ∨ 考试非 ACTIVE。
   * 缺 exam 状态默认只读，与 canSubmit / BE requireActiveExam 同源，禁止关考后假可编辑。
   */
  const isScoreReadOnly = computed(
    () =>
      isReadOnly.value
      || taskRecycledBlocked.value
      || examDetail.value?.status !== ExamStatusCode.ACTIVE,
  )
  const isWholePaperTask = computed(() => task.value?.taskUnit === AllocationUnitCode.WHOLE_PAPER)
  const usesWholePaperWorkspace = computed(
    () =>
      task.value?.taskUnit === AllocationUnitCode.WHOLE_PAPER
      || task.value?.taskUnit === AllocationUnitCode.SELECTED_QUESTIONS
      || task.value?.taskUnit === AllocationUnitCode.RANDOM_QUESTIONS,
  )
  const canSubmit = computed(() => {
    if (taskRecycledBlocked.value) return false
    // MVR-409：关考后禁止给分提交；缺 exam 状态默认拒绝（与 BE requireActiveExam 同源）
    if (examDetail.value?.status !== ExamStatusCode.ACTIVE) {
      return false
    }
    if (sessionPausedAlert.value) {
      return task.value?.taskStatus === MarkingTaskStatusCode.IN_PROGRESS
    }
    const status = task.value?.taskStatus
    return (
      status === MarkingTaskStatusCode.ALLOCATED || status === MarkingTaskStatusCode.IN_PROGRESS
    )
  })

  /** MVR-410：撤回须考试 ACTIVE ∧ 时间窗；与 BE withdrawTask requireActiveExam 同源 */
  function canWithdrawMarkingEntry(entry: (typeof recentList.value)[number]): boolean {
    if (examDetail.value?.status !== ExamStatusCode.ACTIVE) {
      return false
    }
    return canWithdrawEntryByWindow(entry)
  }

  const paperInstanceId = computed(() => {
    if (!task.value) return undefined
    return resolvePaperInstanceId(task.value.paperDisplay)
  })

  /** 加载当前阅卷任务的不可覆盖操作记录，提交与撤回均以审计真源回放。 */
  async function loadReviewRecords(detail: MarkingTaskResponse): Promise<void> {
    reviewRecordsLoading.value = true
    try {
      const page = await listOperationLogs({
        examId: detail.examId,
        targetType: AuditTargetTypeCode.MARKING_TASK,
        targetId: detail.id,
        pageNum: 1,
        pageSize: 100,
      })
      if (page.total > page.list.length) {
        throw new Error('当前阅卷任务批阅记录超过单页加载上限')
      }
      reviewRecords.value = page.list
    } catch (error) {
      reviewRecords.value = []
      showUserError(error, '批阅记录加载失败')
    } finally {
      reviewRecordsLoading.value = false
    }
  }

  const navigation = useMarkingTaskNavigation({ task, isWholePaperTask })

  const questionView = ref<MarkingQuestionViewResponse | null>(null)
  const questionViewLoaded = ref(false)
  const questionViewLoading = ref(false)
  const scoreInputRef = ref<{ focus?: () => void } | null>(null)
  const wholeQuestionScoreInputRefs = ref<Array<{ focus?: () => void } | null>>([])
  const expandedWholeQuestionKey = ref<string>('')

  const wholePaper = useWholePaperGallery({
    getExamId: () => task.value?.examId,
    getTaskId: () => task.value?.id,
    isWholePaperTask: () => task.value?.taskUnit === AllocationUnitCode.WHOLE_PAPER,
    onViewReady: () => focusPrimaryScoreInput(),
  })

  const {
    wholePages,
    wholeQuestions,
    wholePagesLoaded,
    wholePagesLoading,
    wholePagesError,
    wholePageImageUrls,
    wholePageImageLoading,
    wholePageImageErrors,
    wholePageAnnotationForms,
    wholePageViewportRef,
    currentWholePageIndex,
    visibleWholePages,
    wholePageTopSpacerHeight,
    wholePageBottomSpacerHeight,
    getWholeQuestionForm,
    openWholePaperView,
    reloadWholePaperView,
    resetWholePaperState,
    handleWholePageGalleryScroll,
    scrollToWholePage,
    buildWholePaperSubmitRequest,
  } = wholePaper

  const loadTaskHolder: { run: () => Promise<void> } = {
    run: async () => {},
  }
  let loadTaskGeneration = 0

  function clearWithdrawToastTimer(): void {
    if (withdrawToastTimer !== null) {
      clearTimeout(withdrawToastTimer)
      withdrawToastTimer = null
    }
  }

  function dismissWithdrawToast(): void {
    withdrawToastVisible.value = false
    clearWithdrawToastTimer()
  }

  function showWithdrawToast(): void {
    clearWithdrawToastTimer()
    withdrawToastVisible.value = true
    withdrawToastTimer = setTimeout(() => {
      dismissWithdrawToast()
    }, MARKING_WITHDRAW_TOAST_MS)
  }

  const rawGoToTask = navigation.goToTask
  /** 提交链路 / 用户主动切换 分发；构造后再绑定具体实现 */
  const goToTaskDispatch = {
    run: (targetTaskId: string) => {
      rawGoToTask(targetTaskId)
    },
  }

  const submitCtx = useMarkingSubmit({
    taskId,
    task,
    batchTasks,
    questionView,
    usesWholePaperWorkspace,
    isWholePaperTask,
    isReadOnly: isScoreReadOnly,
    canSubmit,
    nextTaskId: navigation.nextNavTaskId,
    goToTask: (targetTaskId: string) => {
      goToTaskDispatch.run(targetTaskId)
    },
    loadTask: () => loadTaskHolder.run(),
    ensureBatchLoaded: navigation.ensureBatchLoaded,
    tenantId,
    form,
    wholeQuestions,
    getWholeQuestionForm,
    wholePageAnnotationForms,
    buildWholePaperSubmitRequest,
    onSubmitSuccess: () => showWithdrawToast(),
  })

  const taskStream = useMarkingTaskStream({
    filter: () => ({
      examId: task.value?.examId ?? '',
      sessionId: task.value?.sessionId,
      scope: MarkingTaskStreamSubscribeScopeCode.TEACHER,
    }),
    when: () => Boolean(task.value?.examId),
    onEvent: (event) => {
      if (event.eventType === MarkingTaskStreamEventTypeCode.SESSION_PAUSED) {
        if (!event.sessionId || event.sessionId === task.value?.sessionId) {
          sessionPausedAlert.value = true
        }
        return
      }
      if (event.eventType === MarkingTaskStreamEventTypeCode.SESSION_RESUMED) {
        if (!event.sessionId || event.sessionId === task.value?.sessionId) {
          sessionPausedAlert.value = false
        }
        return
      }
      if (
        event.eventType === MarkingTaskStreamEventTypeCode.TASK_RECYCLED
        && event.taskId === taskId.value
      ) {
        taskRecycledBlocked.value = true
        if (task.value && event.taskStatus) {
          strictEnumLabel(MarkingTaskStatusDescription, event.taskStatus, '阅卷任务状态')
          task.value = { ...task.value, taskStatus: event.taskStatus }
        } else if (task.value) {
          task.value = { ...task.value, taskStatus: MarkingTaskStatusCode.RECYCLED }
        }
        return
      }
      const action = markTaskStore.applyStreamEvent(event)
      if (action === 'reload') {
        if (task.value?.examId) {
          void markTaskStore.loadTasks(
            {
              examId: task.value.examId,
            },
            { silent: true },
          )
        }
        void loadTask()
        return
      }
      if (
        event.eventType === MarkingTaskStreamEventTypeCode.TASK_WITHDRAWN
        && event.taskId === taskId.value
        && task.value
      ) {
        task.value = { ...task.value, taskStatus: MarkingTaskStatusCode.IN_PROGRESS }
        taskRecycledBlocked.value = false
      }
    },
  })

  async function handleWithdrawLatest(): Promise<void> {
    // MVR-410：撤回二次闸，与 canWithdrawMarkingEntry / BE requireActiveExam 同源
    if (examDetail.value?.status !== ExamStatusCode.ACTIVE) {
      showFormValidationMessage('考试已关闭，不能撤回给分')
      return
    }
    await withdrawLatest((withdrawnTask) => {
      task.value = withdrawnTask
      taskRecycledBlocked.value = false
      if (withdrawnTask.score !== undefined && withdrawnTask.score !== null) {
        form.score = Number(withdrawnTask.score)
      }
      if (withdrawnTask.annotationNote) {
        form.annotationNote = withdrawnTask.annotationNote
      }
      markTaskStore.upsertTask(withdrawnTask)
    })
    withdrawToastVisible.value = false
  }

  async function handleWithdrawEntry(entry: (typeof recentList.value)[number]): Promise<void> {
    // MVR-410：撤回二次闸，与 canWithdrawMarkingEntry / BE requireActiveExam 同源
    if (!canWithdrawMarkingEntry(entry)) {
      showFormValidationMessage(
        examDetail.value?.status !== ExamStatusCode.ACTIVE
          ? '考试已关闭，不能撤回给分'
          : '撤销窗口已过期，不能撤回给分',
      )
      return
    }
    await withdrawEntry(entry, (withdrawnTask) => {
      if (withdrawnTask.id === taskId.value) {
        task.value = withdrawnTask
        taskRecycledBlocked.value = false
        if (withdrawnTask.score !== undefined && withdrawnTask.score !== null) {
          form.score = Number(withdrawnTask.score)
        }
        if (withdrawnTask.annotationNote) {
          form.annotationNote = withdrawnTask.annotationNote
        }
      }
      markTaskStore.upsertTask(withdrawnTask)
    })
  }

  /** 提交成功后的自动跳转放行，避免 hasGradingDraft 误拦 */
  let bypassDirtyLeaveGuard = false

  async function confirmLeaveIfDirty(): Promise<boolean> {
    if (bypassDirtyLeaveGuard || !submitCtx.hasGradingDraft.value) {
      return true
    }
    return confirmAsync({
      title: '尚未提交的阅卷内容将丢失',
      content: '尚未提交的教师给分与批注不会写入。确认离开当前任务？',
      type: 'warning',
      okText: '继续离开',
      cancelText: '留在当前任务',
    })
  }

  /** 提交链路自动下一份：允许携带尚未清空的本地草稿态 */
  function goToTaskAfterSubmit(targetTaskId: string): void {
    bypassDirtyLeaveGuard = true
    rawGoToTask(targetTaskId)
  }

  /** 教师主动切换任务（按钮 / 快捷键）：有草稿则确认 */
  function goToTaskFromUser(targetTaskId: string): void {
    if (!targetTaskId || targetTaskId === taskId.value) {
      return
    }
    void (async () => {
      bypassDirtyLeaveGuard = false
      if (!(await confirmLeaveIfDirty())) {
        return
      }
      bypassDirtyLeaveGuard = true
      rawGoToTask(targetTaskId)
    })()
  }

  goToTaskDispatch.run = goToTaskAfterSubmit
  navigation.goToTask = goToTaskFromUser

  const canKeyboardWithdraw = computed(() => {
    if (examDetail.value?.status !== ExamStatusCode.ACTIVE) {
      return false
    }
    const entry = latestWithdrawable.value
    if (!entry) {
      return false
    }
    return canWithdrawMarkingEntry(entry)
  })

  onBeforeRouteLeave(async () => {
    if (bypassDirtyLeaveGuard) {
      bypassDirtyLeaveGuard = false
      return true
    }
    return confirmLeaveIfDirty()
  })

  useMarkingKeyboard({
    submitting: submitCtx.submitting,
    canSubmit,
    isReadOnly: isScoreReadOnly,
    usesWholePaperWorkspace,
    form,
    questionView,
    prevTaskId: navigation.prevTaskId,
    nextTaskId: navigation.nextNavTaskId,
    currentWholePageIndex,
    expandedWholeQuestionKey,
    wholeQuestions,
    getWholeQuestionForm,
    goToTask: goToTaskFromUser,
    submit: async () => {
      if (taskRecycledBlocked.value) {
        void message.warning('该任务已被组长回收，当前批阅将无法提交')
        return
      }
      await submitCtx.submit()
    },
    scrollToWholePage,
    applyQuickScore: (score: number) => {
      // MVR-414：键盘快捷给分二次闸，与 isScoreReadOnly / 面板 disabled 同源
      if (isScoreReadOnly.value) return
      form.score = score
    },
    onWithdraw: () => {
      void handleWithdrawLatest()
    },
    canWithdraw: canKeyboardWithdraw,
    applyModalOpen: submitCtx.applyModalOpen,
    onApplyModalKey: submitCtx.handleApplyModalKey,
  })

  onMounted(() => {
    void taskStream.start()
  })

  watch(
    () => [task.value?.examId, task.value?.sessionId, task.value?.id] as const,
    () => {
      void taskStream.refresh()
    },
  )

  function applySubmittedQuestionScores(scores: MarkingTaskSubmittedQuestionScoreResponse[]): void {
    if (!scores.length) return
    if (usesWholePaperWorkspace.value) {
      for (const item of scores) {
        const questionForm = getWholeQuestionForm(item.layoutQuestionId)
        questionForm.score = Number(item.score)
        questionForm.annotationText = item.annotationText || ''
        questionForm.reviewSuggestion = item.reviewSuggestion || ''
      }
      return
    }
    const first = scores[0]
    form.score = Number(first.score)
    form.annotationNote = first.annotationText || ''
    form.reviewSuggestion = first.reviewSuggestion || ''
  }

  async function loadTaskPageAnnotationDrafts(): Promise<void> {
    const examId = task.value?.examId
    const paperId = paperInstanceId.value
    const currentTaskId = task.value?.id
    if (!examId || !paperId || !currentTaskId || !wholePages.value.length) return
    const pageSize = Math.max(wholePages.value.length, 1)
    try {
      const page = await listAnnotations({
        examId,
        paperInstanceId: paperId,
        taskId: currentTaskId,
        pageNum: 1,
        pageSize,
      })
      if (page.total > page.list.length) {
        showUserError(new Error('批注数量超过单页加载上限'), '批注列表加载不完整')
        return
      }
      for (const annotation of page.list) {
        if (annotation.annotationScope !== 'PAGE') continue
        if (!annotation.pageId || !annotation.annotationText) continue
        wholePageAnnotationForms[annotation.pageId] = annotation.annotationText
      }
    } catch (error) {
      showUserError(error, '批注列表加载失败')
    }
  }

  async function applyLocalDraftIfNeeded(detail: MarkingTaskResponse): Promise<void> {
    if (!canSubmit.value || !tenantId.value) return
    const key = buildGradingDraftKey(tenantId.value, detail.examId, detail.id)
    const draft = await loadGradingDraft(key)
    if (!draft) return
    const shouldRestore = await offerGradingDraftRestore(draft)
    if (!shouldRestore) return
    if (draft.score !== undefined) form.score = draft.score
    if (draft.annotationNote) form.annotationNote = draft.annotationNote
    if (draft.reviewSuggestion) form.reviewSuggestion = draft.reviewSuggestion
    if (draft.wholeQuestionForms) {
      for (const [templateId, qDraft] of Object.entries(draft.wholeQuestionForms)) {
        const qForm = getWholeQuestionForm(templateId)
        qForm.score = qDraft.score
        qForm.annotationText = qDraft.annotationText
        qForm.reviewSuggestion = qDraft.reviewSuggestion || ''
      }
    }
    if (draft.wholePageAnnotationForms) {
      for (const [pageId, text] of Object.entries(draft.wholePageAnnotationForms)) {
        wholePageAnnotationForms[pageId] = text
      }
    }
  }

  async function loadTask(): Promise<void> {
    if (!taskId.value) return
    const loadGeneration = ++loadTaskGeneration
    loading.value = true
    try {
      const detail = await getMarkingTaskDetail({ taskId: taskId.value })
      if (loadGeneration !== loadTaskGeneration) {
        return
      }
      task.value = detail
      await loadReviewRecords(detail)
      if (loadGeneration !== loadTaskGeneration) {
        return
      }
      taskRecycledBlocked.value = detail.taskStatus === MarkingTaskStatusCode.RECYCLED
      examDetail.value = await getExamDetail(detail.examId)
      if (loadGeneration !== loadTaskGeneration) {
        return
      }
      if (form.score === undefined && detail.score !== undefined && detail.score !== null) {
        form.score = Number(detail.score)
      }
      if (!form.annotationNote && detail.annotationNote) {
        form.annotationNote = detail.annotationNote
      }
      if (!form.reviewSuggestion && detail.reviewSuggestion) {
        form.reviewSuggestion = detail.reviewSuggestion
      }
      await navigation.ensureBatchLoaded(detail.examId)
      if (detail.submittedQuestionScores?.length) {
        applySubmittedQuestionScores(detail.submittedQuestionScores)
      } else {
        await applyLocalDraftIfNeeded(detail)
      }
      if (usesWholePaperWorkspace.value) {
        await openWholePaperView()
        if (loadGeneration !== loadTaskGeneration) {
          return
        }
        syncWholeQuestionAccordion()
        if (isWholePaperTask.value) {
          await loadTaskPageAnnotationDrafts()
        }
      } else {
        await openQuestionView(detail, loadGeneration)
      }
    } catch (error) {
      if (loadGeneration !== loadTaskGeneration) {
        return
      }
      task.value = null
      reviewRecords.value = []
      showUserError(error, '阅卷任务详情加载失败')
    } finally {
      loading.value = false
    }
  }
  loadTaskHolder.run = loadTask

  async function openQuestionView(
    currentTask = task.value,
    loadGeneration = loadTaskGeneration,
  ): Promise<void> {
    if (!currentTask?.examId || !currentTask.id) return
    questionViewLoading.value = true
    try {
      questionView.value = await getMarkingQuestionView({
        examId: currentTask.examId,
        taskId: currentTask.id,
      })
      if (loadGeneration !== loadTaskGeneration) {
        return
      }
      questionViewLoaded.value = true
      syncExperienceAssistMetaFromQuestionView(questionView.value)
      focusPrimaryScoreInput()
    } catch (error) {
      questionView.value = null
      questionViewLoaded.value = false
      lastExperienceAssistMeta.value = null
      showUserError(error, '题目级批阅视图加载失败')
    } finally {
      questionViewLoading.value = false
    }
  }

  async function reloadQuestionView(): Promise<void> {
    questionView.value = null
    questionViewLoaded.value = false
    await openQuestionView()
  }

  function calcHalfScore(fullScore: number | undefined | null): number {
    return Math.round(((fullScore ?? 0) / 2) * 10) / 10
  }

  const questionViewHalfScoreLabel = computed(
    () => `半分 (${calcHalfScore(questionView.value?.fullScore)})`,
  )

  function expectsQuestionViewAiScore(
    view: MarkingQuestionViewResponse | null | undefined,
  ): boolean {
    if (!view || view.aiScore != null) return false
    if (view.questionType === 'SUBJECTIVE') return true
    return view.comparePolicy === 'AI_GRADE'
  }

  const isQuestionViewAiScorePending = computed(() => {
    const view = questionView.value
    if (!expectsQuestionViewAiScore(view)) return false
    return !view?.aiDiagnostic
  })

  function isWholeQuestionAiScorePending(question: QuestionMarkingGroupQuestionResponse): boolean {
    if (question.aiScore != null) return false
    if (question.questionType !== 'SUBJECTIVE') return false
    return !question.aiDiagnostic
  }

  const rescoringGradeResultId = ref<string | null>(null)
  const lastExperienceAssistMeta = ref<{
    applied?: boolean
    sourceExamName?: string
    consistencyRate?: number
    matchMode?: GradingExperienceReferenceMatchModeCode
  } | null>(null)

  function syncExperienceAssistMeta(
    applied?: boolean,
    sourceExamName?: string,
    consistencyRate?: number,
    matchMode?: GradingExperienceReferenceMatchModeCode,
  ): void {
    if (applied) {
      lastExperienceAssistMeta.value = {
        applied: true,
        sourceExamName,
        consistencyRate,
        matchMode,
      }
      return
    }
    lastExperienceAssistMeta.value = null
  }

  function syncExperienceAssistMetaFromAudit(
    audit?: MarkAiReferenceExperienceAuditResponse | null,
  ): void {
    syncExperienceAssistMeta(
      audit?.referenceExperienceApplied,
      audit?.referenceExperienceSourceExamName,
      audit?.referenceExperienceConsistencyRate,
      audit?.referenceExperienceMatchMode,
    )
  }

  function syncExperienceAssistMetaFromQuestionView(
    view: MarkingQuestionViewResponse | null,
  ): void {
    syncExperienceAssistMetaFromAudit(view?.referenceExperienceAudit)
  }

  function syncExperienceAssistMetaFromWholeQuestion(
    question: QuestionMarkingGroupQuestionResponse | null | undefined,
  ): void {
    syncExperienceAssistMetaFromAudit(question?.referenceExperienceAudit)
  }

  function syncExperienceAssistMetaForExpandedWholeQuestion(): void {
    if (!usesWholePaperWorkspace.value || wholeQuestions.value.length === 0) {
      lastExperienceAssistMeta.value = null
      return
    }
    const question = wholeQuestions.value.find(
      (item) => item.layoutQuestionId === expandedWholeQuestionKey.value,
    )
    syncExperienceAssistMetaFromWholeQuestion(question ?? wholeQuestions.value[0])
  }
  const executionsDrawerOpen = ref(false)
  const executionsLoading = ref(false)
  const aiExecutions = ref<ExamQuestionAiExecutionItemResponse[]>([])
  const executionsGradeResultId = ref<string | null>(null)
  const highlightExecutionTraceId = ref<string | null>(null)

  const canRescoreQuestionView = computed(() => {
    // MVR-410：智能复评与给分同源，关考/回收后只读
    if (isScoreReadOnly.value || submitCtx.submitting.value || rescoringGradeResultId.value)
      return false
    return !!questionView.value?.gradeResultId && !!task.value?.examId
  })

  function canRescoreWholeQuestion(question: QuestionMarkingGroupQuestionResponse): boolean {
    // MVR-410：智能复评与给分同源，关考/回收后只读
    if (isScoreReadOnly.value || submitCtx.submitting.value) return false
    if (!question.gradeResultId || !task.value?.examId) return false
    return question.questionType === 'SUBJECTIVE'
  }

  function aiRescoreDiagnosticText(diagnostic?: string): string {
    return getUserErrorMessage(
      { message: diagnostic },
      '智能复评暂未生成可采纳评分，请按题目评分细则继续人工给分',
    )
  }

  async function doRescoreByAi(
    examId: string,
    gradeResultId: string,
    refresh: () => Promise<void>,
  ): Promise<void> {
    // MVR-410：与 isScoreReadOnly / BE rescore requireActiveExam 二次闸
    if (isScoreReadOnly.value) {
      showFormValidationMessage('当前任务不可智能复评（已定稿、已回收或考试已关闭）')
      return
    }
    rescoringGradeResultId.value = gradeResultId
    try {
      const result = await rescoreQuestionByAi({ examId, gradeResultId })
      syncExperienceAssistMetaFromAudit(result.referenceExperienceAudit)
      if (Boolean(result.scored) && result.aiScore != null) {
        void message.success(`智能复评完成，智能评分 ${result.aiScore} 分`)
      } else {
        void message.warning(aiRescoreDiagnosticText(result.diagnostic))
      }
      await refresh()
      if (executionsDrawerOpen.value && executionsGradeResultId.value === gradeResultId) {
        await loadAiExecutions(gradeResultId)
      }
    } catch (error) {
      showUserError(error, '智能复评调用失败')
    } finally {
      rescoringGradeResultId.value = null
    }
  }

  function openRescoreConfirmForQuestionView(): void {
    if (!canRescoreQuestionView.value || !task.value?.examId || !questionView.value?.gradeResultId)
      return
    void confirmAsync({
      title: '重新生成单题 AI 复评？',
      content: '系统会重新生成单题 AI 复评结果，不会直接写入教师给分。',
      type: 'info',
      okText: '生成 AI 复评',
      cancelText: '取消',
      onOk: () =>
        doRescoreByAi(task.value!.examId, questionView.value!.gradeResultId!, reloadQuestionView),
    })
  }

  function openRescoreConfirmForWholeQuestion(
    question: QuestionMarkingGroupQuestionResponse,
  ): void {
    if (!canRescoreWholeQuestion(question) || !task.value?.examId || !question.gradeResultId) return
    void confirmAsync({
      title: `重新生成第 ${question.questionNo} 题 AI 复评？`,
      content: '系统会重新生成单题 AI 复评结果，不会直接写入教师给分。',
      type: 'info',
      okText: '生成 AI 复评',
      cancelText: '取消',
      onOk: () => doRescoreByAi(task.value!.examId, question.gradeResultId!, reloadWholePaperView),
    })
  }

  function openExecutionsDrawerForQuestionView(highlightTraceId?: string | null): void {
    const gradeResultId = questionView.value?.gradeResultId
    if (!gradeResultId) return
    highlightExecutionTraceId.value = highlightTraceId ?? questionView.value?.aiTraceId ?? null
    executionsGradeResultId.value = gradeResultId
    executionsDrawerOpen.value = true
    void loadAiExecutions(gradeResultId)
  }

  function openExecutionsDrawerForWholeQuestion(
    question: QuestionMarkingGroupQuestionResponse,
  ): void {
    if (!question.gradeResultId) return
    highlightExecutionTraceId.value = question.aiTraceId ?? null
    executionsGradeResultId.value = question.gradeResultId
    executionsDrawerOpen.value = true
    void loadAiExecutions(question.gradeResultId)
  }

  async function loadAiExecutions(gradeResultId: string): Promise<void> {
    if (!task.value?.examId) return
    executionsLoading.value = true
    try {
      aiExecutions.value = await listAiExecutionsForQuestion({
        examId: task.value.examId,
        gradeResultId,
      })
      aiExecutions.value.forEach((record) => {
        strictEnumLabel(AiAbilityDescription, record.abilityCode, 'AI 能力编码')
        strictEnumLabel(AiExecutionStatusDescription, record.status, 'AI 执行状态')
      })
    } catch (error) {
      showUserError(error, '智能复评历史加载失败')
      aiExecutions.value = []
    } finally {
      executionsLoading.value = false
    }
  }

  function aiAbilityLabel(code: AiAbilityCode): string {
    return strictEnumLabel(AiAbilityDescription, code, 'AI 能力编码')
  }

  function aiAbilityTone(code: AiAbilityCode) {
    return strictEnumTone(AI_ABILITY_TONE, code, 'AI 能力编码')
  }

  function aiExecutionStatusLabel(status: AiExecutionStatusCode): string {
    return strictEnumLabel(AiExecutionStatusDescription, status, 'AI 执行状态')
  }

  function aiExecutionStatusTone(status: AiExecutionStatusCode) {
    return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
  }

  function aiExecutionTimelineColor(status: AiExecutionStatusCode): string {
    return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
  }

  function isWholeQuestionScored(layoutQuestionId: string): boolean {
    const score = getWholeQuestionForm(layoutQuestionId).score
    return score !== undefined && score !== null
  }

  function resolveDefaultExpandedQuestionKey(): string {
    const firstUnscored = wholeQuestions.value.find(
      (question) => !isWholeQuestionScored(question.layoutQuestionId),
    )
    if (firstUnscored) return firstUnscored.layoutQuestionId
    const lastQuestion = wholeQuestions.value[wholeQuestions.value.length - 1]
    return lastQuestion?.layoutQuestionId ?? ''
  }

  function syncWholeQuestionAccordion(): void {
    if (!usesWholePaperWorkspace.value || wholeQuestions.value.length === 0) {
      expandedWholeQuestionKey.value = ''
      return
    }
    expandedWholeQuestionKey.value = resolveDefaultExpandedQuestionKey()
    syncExperienceAssistMetaForExpandedWholeQuestion()
  }

  function expandWholeQuestion(index: number): void {
    const question = wholeQuestions.value[index]
    if (question) {
      expandedWholeQuestionKey.value = question.layoutQuestionId
      syncExperienceAssistMetaFromWholeQuestion(question)
    }
  }

  function setWholeQuestionScoreInputRef(el: unknown, index: number): void {
    wholeQuestionScoreInputRefs.value[index] = isFocusableElement(el) ? el : null
  }

  function isFocusableElement(el: unknown): el is { focus?: () => void } {
    return (
      typeof el === 'object' && el !== null && (!('focus' in el) || typeof el.focus === 'function')
    )
  }

  function handleGalleryViewportReady(element: HTMLElement | null): void {
    wholePageViewportRef.value = element
  }

  function focusPrimaryScoreInput(): void {
    window.requestAnimationFrame(() => {
      if (usesWholePaperWorkspace.value) {
        syncWholeQuestionAccordion()
        const index = wholeQuestions.value.findIndex(
          (question) => question.layoutQuestionId === expandedWholeQuestionKey.value,
        )
        focusWholeQuestionScoreInput(index >= 0 ? index : 0)
        return
      }
      scoreInputRef.value?.focus?.()
    })
  }

  function focusWholeQuestionScoreInput(index: number): void {
    expandWholeQuestion(index)
    window.requestAnimationFrame(() => {
      wholeQuestionScoreInputRefs.value[index]?.focus?.()
    })
  }

  function focusWholeQuestionPage(question: QuestionMarkingGroupQuestionResponse): void {
    const pageIndex = wholePages.value.findIndex((page) => page.pageId === question.pageId)
    if (pageIndex < 0) {
      void message.error(`第 ${question.questionNo} 题未找到对应答题页`)
      return
    }
    scrollToWholePage(pageIndex)
  }

  function handleWholeQuestionScoreEnter(questionIndex: number): void {
    // MVR-414：整卷题号 Enter 推进/提交叠 canSubmit ∧ !isScoreReadOnly
    if (submitCtx.submitting.value || !canSubmit.value || isScoreReadOnly.value) return
    const question = wholeQuestions.value[questionIndex]
    if (!question) return
    const questionForm = getWholeQuestionForm(question.layoutQuestionId)
    if (questionForm.score === undefined || questionForm.score === null) {
      void message.warning(`请先填写第 ${question.questionNo} 题给分`)
      return
    }
    if (questionIndex < wholeQuestions.value.length - 1) {
      focusWholeQuestionScoreInput(questionIndex + 1)
      return
    }
    void submitCtx.submit()
  }

  function fillWholeQuestionAiScore(question: QuestionMarkingGroupQuestionResponse): void {
    if (question.aiScore == null) return
    // MVR-414：仅改本地表单也须叠 isScoreReadOnly，禁止只读态假可写/草稿漂移
    if (isScoreReadOnly.value) {
      showFormValidationMessage('当前不可给分（已定稿/已回收或考试已关闭）')
      return
    }
    getWholeQuestionForm(question.layoutQuestionId).score = question.aiScore
    void message.success(`已填入第 ${question.questionNo} 题智能建议分`)
  }

  async function acceptWholeQuestionAiScore(
    question: QuestionMarkingGroupQuestionResponse,
    questionIndex: number,
  ): Promise<void> {
    if (question.aiScore == null || submitCtx.submitting.value) return
    // MVR-413：与 canSubmit / isScoreReadOnly 二次闸；末题提交依赖 submit 内闸
    if (isScoreReadOnly.value || !canSubmit.value) {
      showFormValidationMessage(
        isScoreReadOnly.value
          ? '当前不可给分（已定稿/已回收或考试已关闭）'
          : '当前任务状态不可提交给分',
      )
      return
    }
    getWholeQuestionForm(question.layoutQuestionId).score = question.aiScore
    if (questionIndex < wholeQuestions.value.length - 1) {
      focusWholeQuestionScoreInput(questionIndex + 1)
      void message.success(`已采纳第 ${question.questionNo} 题智能分`)
      return
    }
    await submitCtx.submit()
  }

  function applyQuickScoreToWholeQuestion(
    question: QuestionMarkingGroupQuestionResponse,
    score: number,
  ): void {
    // MVR-414：整卷快捷数字与 isScoreReadOnly 二次闸（非 UI 入口亦不可写）
    if (isScoreReadOnly.value) return
    if (score > question.fullScore) return
    getWholeQuestionForm(question.layoutQuestionId).score = score
  }

  /**
   * 单题快捷给分（满分/半分/零分/AI/数字键）
   * MVR-414：与 isScoreReadOnly 同源二次闸，避免模板直写 form.score 绕过只读
   */
  function applyPrimaryQuickScore(score: number | undefined): void {
    if (isScoreReadOnly.value) return
    if (score === undefined || Number.isNaN(Number(score))) return
    form.score = Number(score)
  }

  const revealOpen = ref(false)
  const revealedIdentity = ref<AnonymousRevealResponse | null>(null)
  let revealExpireTimer: ReturnType<typeof window.setTimeout> | null = null

  function openRevealDialog(): void {
    // MVR-375：与 BE canManageOwnerIdentityReveal 二次拦截，禁止仅入口隐藏
    if (!canManageOwnerIdentityReveal.value) {
      showFormValidationMessage('当前账号无解匿名权限')
      return
    }
    revealOpen.value = true
  }

  function clearRevealedIdentity(): void {
    if (revealExpireTimer) {
      window.clearTimeout(revealExpireTimer)
      revealExpireTimer = null
    }
    revealedIdentity.value = null
  }

  function handleAnonymousRevealed(result: AnonymousRevealResponse): void {
    revealedIdentity.value = result
    if (revealExpireTimer) {
      window.clearTimeout(revealExpireTimer)
      revealExpireTimer = null
    }
    const expireAt = Date.parse(result.revealExpireTime)
    if (!Number.isFinite(expireAt)) {
      showFormValidationMessage('身份查看时间异常')
      return
    }
    revealExpireTimer = window.setTimeout(clearRevealedIdentity, Math.max(expireAt - Date.now(), 0))
  }

  watch(
    () => [
      form.score,
      form.annotationNote,
      form.reviewSuggestion,
      wholeQuestions.value.map((question) => {
        const qForm = getWholeQuestionForm(question.layoutQuestionId)
        return [qForm.score, qForm.annotationText, qForm.reviewSuggestion]
      }),
      Object.entries(wholePageAnnotationForms).map(([pageId, text]) => [pageId, text]),
    ],
    () => submitCtx.persistDraftIfNeeded(),
    { deep: true },
  )

  watch(
    submitCtx.hasGradingDraft,
    (dirty) => {
      if (!workbenchContext?.workspaceUnsavedHint) return
      workbenchContext.workspaceUnsavedHint.value = dirty
        ? '当前阅卷评分尚未提交，离开工作台将丢失未保存内容'
        : null
    },
    { immediate: true },
  )

  watch(
    taskId,
    () => {
      form.score = undefined
      form.annotationNote = ''
      form.reviewSuggestion = ''
      task.value = null
      examDetail.value = null
      taskRecycledBlocked.value = false
      sessionPausedAlert.value = false
      withdrawToastVisible.value = false
      clearWithdrawToastTimer()
      questionView.value = null
      questionViewLoaded.value = false
      questionViewLoading.value = false
      resetWholePaperState()
      wholeQuestionScoreInputRefs.value = []
      expandedWholeQuestionKey.value = ''
      clearRevealedIdentity()
      revealOpen.value = false
      void loadTask()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    clearRevealedIdentity()
    clearWithdrawToastTimer()
    taskStream.stop()
    if (workbenchContext?.workspaceUnsavedHint) {
      workbenchContext.workspaceUnsavedHint.value = null
    }
  })

  return {
    taskId,
    task,
    reviewRecords,
    reviewRecordsLoading,
    loading,
    form,
    isExamConfidential,
    examConfidentialLabel,
    examWatermarkLines,
    canManageOwnerIdentityReveal,
    isReadOnly,
    isScoreReadOnly,
    taskRecycledBlocked,
    sessionPausedAlert,
    withdrawToastVisible,
    latestWithdrawable,
    withdrawWindowLabel,
    withdrawConfirmHint,
    recentList,
    canWithdrawEntry: canWithdrawMarkingEntry,
    handleWithdrawLatest,
    handleWithdrawEntry,
    dismissWithdrawToast,
    isWholePaperTask,
    usesWholePaperWorkspace,
    canSubmit,
    questionView,
    questionViewLoaded,
    questionViewLoading,
    questionViewHalfScoreLabel,
    isQuestionViewAiScorePending,
    scoreInputRef,
    wholePages,
    wholeQuestions,
    wholePagesLoaded,
    wholePagesLoading,
    wholePagesError,
    wholePageImageUrls,
    wholePageImageLoading,
    wholePageImageErrors,
    wholePageAnnotationForms,
    currentWholePageIndex,
    visibleWholePages,
    wholePageTopSpacerHeight,
    wholePageBottomSpacerHeight,
    expandedWholeQuestionKey,
    getWholeQuestionForm,
    reloadWholePaperView,
    handleWholePageGalleryScroll,
    handleGalleryViewportReady,
    revealOpen,
    revealedIdentity,
    executionsDrawerOpen,
    executionsLoading,
    aiExecutions,
    highlightExecutionTraceId,
    rescoringGradeResultId,
    lastExperienceAssistMeta,
    formRef: submitCtx.formRef,
    submitting: submitCtx.submitting,
    rules: submitCtx.rules,
    submit: submitCtx.submit,
    acceptAiScoreAndSubmit: submitCtx.acceptAiScoreAndSubmit,
    applyModalOpen: submitCtx.applyModalOpen,
    applyModalCountdown: submitCtx.applyModalCountdown,
    remainingSameQuestionCount: submitCtx.remainingSameQuestionCount,
    submittedScoreSnapshot: submitCtx.submittedScoreSnapshot,
    batchApplying: submitCtx.batchApplying,
    applyScoreToRemaining: submitCtx.applyScoreToRemaining,
    dismissApplyModalAndContinue: submitCtx.dismissApplyModalAndContinue,
    navigation,
    loadTask,
    formatDateTime,
    taskStatusTone,
    taskStatusLabel,
    allocationUnitLabel,
    anonymityModeLabel,
    scanPageQualityLabel,
    scanPageQualityTone,
    calcHalfScore,
    isWholeQuestionScored,
    isWholeQuestionAiScorePending,
    canRescoreQuestionView,
    canRescoreWholeQuestion,
    setWholeQuestionScoreInputRef,
    handleWholeQuestionScoreEnter,
    fillWholeQuestionAiScore,
    acceptWholeQuestionAiScore,
    applyQuickScoreToWholeQuestion,
    applyPrimaryQuickScore,
    focusWholeQuestionPage,
    openRescoreConfirmForQuestionView,
    openRescoreConfirmForWholeQuestion,
    openExecutionsDrawerForQuestionView,
    openExecutionsDrawerForWholeQuestion,
    openRevealDialog,
    handleAnonymousRevealed,
    aiAbilityLabel,
    aiAbilityTone,
    aiExecutionStatusLabel,
    aiExecutionStatusTone,
    aiExecutionTimelineColor,
  }
}
