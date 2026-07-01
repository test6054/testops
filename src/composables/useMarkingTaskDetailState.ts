import type { AnonymityModeCode } from '@/apis/mark/anonymity-mode'
import { ANONYMITY_MODE_LABEL } from '@/apis/mark/anonymity-mode'
import type { ExamDetailVO } from '@/apis/mark/exam'
import { getExamDetail } from '@/apis/mark/exam'
import type {
  AiAbilityCode,
  AiExecutionStatusCode,
  ExamQuestionAiExecutionItemVO,
} from '@/apis/mark/exam-grade'
import {
  AI_ABILITY_LABEL,
  AI_ABILITY_TONE,
  AI_EXECUTION_STATUS_LABEL,
  AI_EXECUTION_STATUS_TONE,
  listAiExecutionsForQuestion,
  rescoreQuestionByAi,
} from '@/apis/mark/exam-grade'
import type { QualityDecisionCode } from '@/apis/mark/exam-scan'
import { QUALITY_DECISION_LABEL, QUALITY_DECISION_TONE } from '@/apis/mark/exam-scan'
import type { PaperInstanceDisplayVO } from '@/apis/mark/exam-score'
import type {
  AllocationUnitCode,
  AnonymousRevealVO,
  MarkingQuestionViewVO,
  MarkingTaskStatusCode,
  MarkingTaskSubmittedQuestionScoreVO,
  MarkingTaskVO,
  QuestionMarkingGroupQuestionVO,
} from '@/apis/mark/marking-organization'
import {
  ALLOCATION_UNIT_LABEL,
  getMarkingQuestionView,
  getMarkingTaskDetail,
  MARKING_TASK_STATUS_LABEL as STATUS_LABEL,
  MARKING_TASK_STATUS_TONE as STATUS_TONE,
  validateMarkingTaskContract,
} from '@/apis/mark/marking-organization'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { storeToRefs } from 'pinia'
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { listAnnotations, validateAnnotationContract } from '@/apis/mark/exam-annotation'
import { MARKING_WITHDRAW_TOAST_MS } from '@/apis/mark/marking-withdraw'
import {
  buildConfidentialWatermarkLines,
  formatExamConfidentialLabel,
  isExamConfidentialFlag,
} from '@/composables/useConfidentialWatermark'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamOwnerPermission } from '@/composables/useExamOwnerPermission'
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
import { useWholePaperGallery } from '@/composables/useWholePaperGallery'
import { useMarkTaskStore } from '@/stores/modules/markTask'
import { useTenantStore } from '@/stores/modules/tenant'
import { useUserStore } from '@/stores/modules/user'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const SUBMITTED_PAGE_ANNOTATION_PAGE_SIZE = 100

function taskStatusTone(status: MarkingTaskStatusCode): BadgeTone {
  return strictEnumTone(STATUS_TONE, status, '阅卷任务状态')
}

function taskStatusLabel(status: MarkingTaskStatusCode): string {
  return strictEnumLabel(STATUS_LABEL, status, '阅卷任务状态')
}

function allocationUnitLabel(unit: AllocationUnitCode): string {
  return strictEnumLabel(ALLOCATION_UNIT_LABEL, unit, '批阅任务单元')
}

function anonymityModeLabel(mode: AnonymityModeCode): string {
  return strictEnumLabel(ANONYMITY_MODE_LABEL, mode, '匿名模式')
}

function scanPageQualityLabel(status: QualityDecisionCode): string {
  return strictEnumLabel(QUALITY_DECISION_LABEL, status, '扫描页质量判定')
}

function scanPageQualityTone(status: QualityDecisionCode): BadgeTone {
  return strictEnumTone(QUALITY_DECISION_TONE, status, '扫描页质量判定')
}

function resolvePaperInstanceId(display: PaperInstanceDisplayVO): string | undefined {
  if (display.displayMode === 'REAL_NAME' || display.displayMode === 'ANONYMOUS') {
    return display.paperInstanceId
  }
  return undefined
}

export function useMarkingTaskDetailState() {
  const route = useRoute()
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  const tenantStore = useTenantStore()
  const markTaskStore = useMarkTaskStore()
  const userStore = useUserStore()
  const { tasks: batchTasks } = storeToRefs(markTaskStore)
  const { latestWithdrawable, recentList, canWithdrawEntry, withdrawEntry, withdrawLatest } =
    useMarkingRecentSubmit()

  const taskId = computed(() => (route.params.taskId ? String(route.params.taskId) : ''))
  const tenantId = computed(() => tenantStore.tenantId ?? '')

  const task = ref<MarkingTaskVO | null>(null)
  const examDetail = ref<ExamDetailVO | null>(null)
  const loading = ref(false)
  const taskRecycledBlocked = ref(false)
  const sessionPausedAlert = ref(false)
  const withdrawToastVisible = ref(false)
  let withdrawToastTimer: ReturnType<typeof setTimeout> | null = null
  const form = reactive<{ score?: number; annotationNote?: string }>({
    score: undefined,
    annotationNote: '',
  })

  const isExamConfidential = computed(() => isExamConfidentialFlag(examDetail.value?.confidential))
  const examConfidentialLabel = computed(() => formatExamConfidentialLabel(examDetail.value))
  const examWatermarkLines = computed(() =>
    buildConfidentialWatermarkLines({ examLabel: examConfidentialLabel.value }),
  )
  const { isExamOwner } = useExamOwnerPermission(examDetail)
  const isReadOnly = computed(() => task.value?.taskStatus === 'FINALIZED')
  const isScoreReadOnly = computed(() => isReadOnly.value || taskRecycledBlocked.value)
  const isWholePaperTask = computed(() => task.value?.taskUnit === 'WHOLE_PAPER')
  const usesWholePaperWorkspace = computed(
    () =>
      task.value?.taskUnit === 'WHOLE_PAPER' ||
      task.value?.taskUnit === 'SELECTED_QUESTIONS' ||
      task.value?.taskUnit === 'RANDOM_QUESTIONS',
  )
  const canSubmit = computed(() => {
    if (taskRecycledBlocked.value) return false
    const status = task.value?.taskStatus
    return status === 'ALLOCATED' || status === 'IN_PROGRESS'
  })

  const paperInstanceId = computed(() => {
    if (!task.value) return undefined
    return resolvePaperInstanceId(task.value.paperDisplay)
  })

  const navigation = useMarkingTaskNavigation({ task, isWholePaperTask })

  const questionView = ref<MarkingQuestionViewVO | null>(null)
  const questionViewLoaded = ref(false)
  const questionViewLoading = ref(false)
  const scoreInputRef = ref<{ focus?: () => void } | null>(null)
  const wholeQuestionScoreInputRefs = ref<Array<{ focus?: () => void } | null>>([])
  const expandedWholeQuestionKey = ref<string>('')

  const wholePaper = useWholePaperGallery({
    getExamId: () => task.value?.examId,
    getTaskId: () => task.value?.id,
    isWholePaperTask: () => task.value?.taskUnit === 'WHOLE_PAPER',
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

  const submitCtx = useMarkingSubmit({
    taskId,
    task,
    batchTasks,
    questionView,
    usesWholePaperWorkspace,
    isWholePaperTask,
    isReadOnly: isScoreReadOnly,
    canSubmit,
    nextTaskId: navigation.nextTaskId,
    goToTask: navigation.goToTask,
    loadTask: () => loadTaskHolder.run(),
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
      scope: 'teacher',
    }),
    when: () => Boolean(task.value?.examId),
    onEvent: (event) => {
      if (event.eventType === 'SESSION_PAUSED') {
        sessionPausedAlert.value = true
        return
      }
      if (event.eventType === 'SESSION_RESUMED') {
        sessionPausedAlert.value = false
        return
      }
      if (event.eventType === 'TASK_RECYCLED' && event.taskId === taskId.value) {
        taskRecycledBlocked.value = true
        if (task.value && event.taskStatus) {
          strictEnumLabel(STATUS_LABEL, event.taskStatus, '阅卷任务状态')
          task.value = { ...task.value, taskStatus: event.taskStatus }
        } else if (task.value) {
          task.value = { ...task.value, taskStatus: 'RECYCLED' }
        }
        return
      }
      const action = markTaskStore.applyStreamEvent(event)
      if (action === 'reload') {
        if (task.value?.examId) {
          void markTaskStore.loadTasks(
            {
              examId: task.value.examId,
              reviewerUserId: navigationBatchReviewerId(),
            },
            { silent: true },
          )
        }
        void loadTask()
        return
      }
      if (event.eventType === 'TASK_WITHDRAWN' && event.taskId === taskId.value && task.value) {
        task.value = { ...task.value, taskStatus: 'IN_PROGRESS' }
        taskRecycledBlocked.value = false
      }
    },
  })

  function navigationBatchReviewerId(): string {
    return userStore.userInfo.userId ?? task.value?.reviewerUserId ?? ''
  }

  async function handleWithdrawLatest(): Promise<void> {
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

  useMarkingKeyboard({
    submitting: submitCtx.submitting,
    canSubmit,
    isReadOnly: isScoreReadOnly,
    usesWholePaperWorkspace,
    form,
    questionView,
    prevTaskId: navigation.prevTaskId,
    nextTaskId: navigation.nextTaskId,
    currentWholePageIndex,
    expandedWholeQuestionKey,
    wholeQuestions,
    getWholeQuestionForm,
    goToTask: navigation.goToTask,
    submit: async () => {
      if (taskRecycledBlocked.value) {
        message.warning('该任务已被组长回收，当前批阅将无法提交')
        return
      }
      await submitCtx.submit()
    },
    scrollToWholePage,
    applyQuickScore: (score: number) => {
      form.score = score
    },
    onWithdraw: () => {
      void handleWithdrawLatest()
    },
    applyModalOpen: submitCtx.applyModalOpen,
    onApplyModalKey: submitCtx.handleApplyModalKey,
  })

  onMounted(() => {
    void taskStream.start()
  })

  watch(
    () => task.value?.examId,
    () => {
      void taskStream.refresh()
    },
  )

  function applySubmittedQuestionScores(scores: MarkingTaskSubmittedQuestionScoreVO[]): void {
    if (!scores.length) return
    if (usesWholePaperWorkspace.value) {
      for (const item of scores) {
        const questionForm = getWholeQuestionForm(item.questionTemplateId)
        questionForm.score = Number(item.score)
        questionForm.annotationText = item.annotationText || ''
      }
      return
    }
    const first = scores[0]
    form.score = Number(first.score)
    form.annotationNote = first.annotationText || ''
  }

  async function loadSubmittedPageAnnotations(): Promise<void> {
    const examId = task.value?.examId
    const paperId = paperInstanceId.value
    if (!examId || !paperId || !wholePages.value.length) return
    const pageAnnotations = await readAllPages(
      (pageNum) =>
        listAnnotations({
          examId,
          paperInstanceId: paperId,
          pageNum,
          pageSize: SUBMITTED_PAGE_ANNOTATION_PAGE_SIZE,
        }),
      '批注列表加载失败，请刷新后重试',
    )
    for (const annotation of pageAnnotations) {
      validateAnnotationContract(annotation)
      if (annotation.annotationScope !== 'PAGE') continue
      if (!annotation.pageId || !annotation.annotationText) continue
      wholePageAnnotationForms[annotation.pageId] = annotation.annotationText
    }
  }

  async function applyLocalDraftIfNeeded(detail: MarkingTaskVO): Promise<void> {
    if (!canSubmit.value || !tenantId.value) return
    const key = buildGradingDraftKey(tenantId.value, detail.examId, detail.id)
    const draft = await loadGradingDraft(key)
    if (!draft) return
    const shouldRestore = await offerGradingDraftRestore(draft)
    if (!shouldRestore) return
    if (draft.score !== undefined) form.score = draft.score
    if (draft.annotationNote) form.annotationNote = draft.annotationNote
    if (draft.wholeQuestionForms) {
      for (const [templateId, qDraft] of Object.entries(draft.wholeQuestionForms)) {
        const qForm = getWholeQuestionForm(templateId)
        qForm.score = qDraft.score
        qForm.annotationText = qDraft.annotationText
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
    loading.value = true
    try {
      const detail = await getMarkingTaskDetail({ taskId: taskId.value })
      validateMarkingTaskContract(detail)
      task.value = detail
      taskRecycledBlocked.value = detail.taskStatus === 'RECYCLED'
      examDetail.value = await getExamDetail(detail.examId)
      if (form.score === undefined && detail.score !== undefined && detail.score !== null) {
        form.score = Number(detail.score)
      }
      if (!form.annotationNote && detail.annotationNote) {
        form.annotationNote = detail.annotationNote
      }
      void navigation.ensureBatchLoaded(detail.examId)
      if (detail.submittedQuestionScores?.length) {
        applySubmittedQuestionScores(detail.submittedQuestionScores)
      } else {
        await applyLocalDraftIfNeeded(detail)
      }
      if (usesWholePaperWorkspace.value) {
        await openWholePaperView()
        syncWholeQuestionAccordion()
        if (isWholePaperTask.value && detail.taskStatus === 'FINALIZED') {
          await loadSubmittedPageAnnotations()
        }
      } else {
        await openQuestionView(detail)
      }
    } catch (error) {
      task.value = null
      showUserError(error, '阅卷任务详情加载失败')
    } finally {
      loading.value = false
    }
  }
  loadTaskHolder.run = loadTask

  async function openQuestionView(currentTask = task.value): Promise<void> {
    if (!currentTask?.examId || !currentTask.id) return
    questionViewLoading.value = true
    try {
      questionView.value = await getMarkingQuestionView({
        examId: currentTask.examId,
        taskId: currentTask.id,
      })
      questionViewLoaded.value = true
      focusPrimaryScoreInput()
    } catch (error) {
      questionView.value = null
      questionViewLoaded.value = false
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

  function expectsQuestionViewAiScore(view: MarkingQuestionViewVO | null | undefined): boolean {
    if (!view || view.aiScore != null) return false
    if (view.questionType === 'SUBJECTIVE') return true
    return view.comparePolicy === 'AI_GRADE'
  }

  const isQuestionViewAiScorePending = computed(() => {
    const view = questionView.value
    if (!expectsQuestionViewAiScore(view)) return false
    return !view?.aiDiagnostic
  })

  function isWholeQuestionAiScorePending(question: QuestionMarkingGroupQuestionVO): boolean {
    if (question.aiScore != null) return false
    if (question.questionType !== 'SUBJECTIVE') return false
    return !question.aiDiagnostic
  }

  const rescoringGradeResultId = ref<string | null>(null)
  const executionsDrawerOpen = ref(false)
  const executionsLoading = ref(false)
  const aiExecutions = ref<ExamQuestionAiExecutionItemVO[]>([])
  const executionsGradeResultId = ref<string | null>(null)

  const canRescoreQuestionView = computed(() => {
    if (isReadOnly.value || submitCtx.submitting.value || rescoringGradeResultId.value) return false
    return !!questionView.value?.gradeResultId && !!task.value?.examId
  })

  function canRescoreWholeQuestion(question: QuestionMarkingGroupQuestionVO): boolean {
    if (isReadOnly.value || submitCtx.submitting.value) return false
    if (!question.gradeResultId || !task.value?.examId) return false
    return question.questionType === 'SUBJECTIVE'
  }

  function aiRescoreDiagnosticText(diagnostic?: string): string {
    return getUserErrorMessage(
      { message: diagnostic },
      'AI 复评暂未生成可采纳评分，请按题目评分细则继续人工给分',
    )
  }

  async function doRescoreByAi(
    examId: string,
    gradeResultId: string,
    refresh: () => Promise<void>,
  ): Promise<void> {
    rescoringGradeResultId.value = gradeResultId
    try {
      const result = await rescoreQuestionByAi({ examId, gradeResultId })
      if (Boolean(result.scored) && result.aiScore != null) {
        message.success(`AI 复评完成，AI 评分 ${result.aiScore} 分`)
      } else {
        message.warning(aiRescoreDiagnosticText(result.diagnostic))
      }
      await refresh()
      if (executionsDrawerOpen.value && executionsGradeResultId.value === gradeResultId) {
        await loadAiExecutions(gradeResultId)
      }
    } catch (error) {
      showUserError(error, 'AI 复评调用失败')
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

  function openRescoreConfirmForWholeQuestion(question: QuestionMarkingGroupQuestionVO): void {
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

  function openExecutionsDrawerForQuestionView(): void {
    const gradeResultId = questionView.value?.gradeResultId
    if (!gradeResultId) return
    executionsGradeResultId.value = gradeResultId
    executionsDrawerOpen.value = true
    void loadAiExecutions(gradeResultId)
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
        strictEnumLabel(AI_ABILITY_LABEL, record.abilityCode, 'AI 能力编码')
        strictEnumLabel(AI_EXECUTION_STATUS_LABEL, record.status, 'AI 执行状态')
      })
    } catch (error) {
      showUserError(error, 'AI 复评历史加载失败')
      aiExecutions.value = []
    } finally {
      executionsLoading.value = false
    }
  }

  function aiAbilityLabel(code: AiAbilityCode): string {
    return strictEnumLabel(AI_ABILITY_LABEL, code, 'AI 能力编码')
  }

  function aiAbilityTone(code: AiAbilityCode) {
    return strictEnumTone(AI_ABILITY_TONE, code, 'AI 能力编码')
  }

  function aiExecutionStatusLabel(status: AiExecutionStatusCode): string {
    return strictEnumLabel(AI_EXECUTION_STATUS_LABEL, status, 'AI 执行状态')
  }

  function aiExecutionStatusTone(status: AiExecutionStatusCode) {
    return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
  }

  function aiExecutionTimelineColor(status: AiExecutionStatusCode): string {
    return strictEnumTone(AI_EXECUTION_STATUS_TONE, status, 'AI 执行状态')
  }

  function isWholeQuestionScored(questionTemplateId: string): boolean {
    const score = getWholeQuestionForm(questionTemplateId).score
    return score !== undefined && score !== null
  }

  function resolveDefaultExpandedQuestionKey(): string {
    const firstUnscored = wholeQuestions.value.find(
      (question) => !isWholeQuestionScored(question.questionTemplateId),
    )
    if (firstUnscored) return firstUnscored.questionTemplateId
    const lastQuestion = wholeQuestions.value[wholeQuestions.value.length - 1]
    return lastQuestion?.questionTemplateId ?? ''
  }

  function syncWholeQuestionAccordion(): void {
    if (!usesWholePaperWorkspace.value || wholeQuestions.value.length === 0) {
      expandedWholeQuestionKey.value = ''
      return
    }
    expandedWholeQuestionKey.value = resolveDefaultExpandedQuestionKey()
  }

  function expandWholeQuestion(index: number): void {
    const question = wholeQuestions.value[index]
    if (question) expandedWholeQuestionKey.value = question.questionTemplateId
  }

  function setWholeQuestionScoreInputRef(el: unknown, index: number): void {
    wholeQuestionScoreInputRefs.value[index] = (el as { focus?: () => void } | null) ?? null
  }

  function handleGalleryViewportReady(element: HTMLElement | null): void {
    wholePageViewportRef.value = element
  }

  function focusPrimaryScoreInput(): void {
    window.requestAnimationFrame(() => {
      if (usesWholePaperWorkspace.value) {
        syncWholeQuestionAccordion()
        const index = wholeQuestions.value.findIndex(
          (question) => question.questionTemplateId === expandedWholeQuestionKey.value,
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

  function focusWholeQuestionPage(question: QuestionMarkingGroupQuestionVO): void {
    const pageIndex = wholePages.value.findIndex((page) => page.pageId === question.pageId)
    if (pageIndex < 0) {
      message.error(`第 ${question.questionNo} 题未找到对应答题页`)
      return
    }
    scrollToWholePage(pageIndex)
  }

  function handleWholeQuestionScoreEnter(questionIndex: number): void {
    if (submitCtx.submitting.value || !canSubmit.value) return
    const question = wholeQuestions.value[questionIndex]
    if (!question) return
    const questionForm = getWholeQuestionForm(question.questionTemplateId)
    if (questionForm.score === undefined || questionForm.score === null) {
      message.warning(`请先填写第 ${question.questionNo} 题给分`)
      return
    }
    if (questionIndex < wholeQuestions.value.length - 1) {
      focusWholeQuestionScoreInput(questionIndex + 1)
      return
    }
    void submitCtx.submit()
  }

  function fillWholeQuestionAiScore(question: QuestionMarkingGroupQuestionVO): void {
    if (question.aiScore == null) return
    getWholeQuestionForm(question.questionTemplateId).score = question.aiScore
    message.success(`已填入第 ${question.questionNo} 题 AI 建议分`)
  }

  async function acceptWholeQuestionAiScore(
    question: QuestionMarkingGroupQuestionVO,
    questionIndex: number,
  ): Promise<void> {
    if (question.aiScore == null || submitCtx.submitting.value) return
    getWholeQuestionForm(question.questionTemplateId).score = question.aiScore
    if (questionIndex < wholeQuestions.value.length - 1) {
      focusWholeQuestionScoreInput(questionIndex + 1)
      message.success(`已采纳第 ${question.questionNo} 题 AI 分`)
      return
    }
    await submitCtx.submit()
  }

  function applyQuickScoreToWholeQuestion(
    question: QuestionMarkingGroupQuestionVO,
    score: number,
  ): void {
    if (score > question.fullScore) return
    getWholeQuestionForm(question.questionTemplateId).score = score
  }

  const revealOpen = ref(false)
  const revealedIdentity = ref<AnonymousRevealVO | null>(null)
  let revealExpireTimer: ReturnType<typeof window.setTimeout> | null = null

  function openRevealDialog(): void {
    revealOpen.value = true
  }

  function clearRevealedIdentity(): void {
    if (revealExpireTimer) {
      window.clearTimeout(revealExpireTimer)
      revealExpireTimer = null
    }
    revealedIdentity.value = null
  }

  function handleAnonymousRevealed(result: AnonymousRevealVO): void {
    revealedIdentity.value = result
    if (revealExpireTimer) {
      window.clearTimeout(revealExpireTimer)
      revealExpireTimer = null
    }
    const expireAt = Date.parse(result.revealExpireTime)
    if (!Number.isFinite(expireAt)) {
      showUserError(null, '身份查看时间异常，请稍后重试')
      return
    }
    revealExpireTimer = window.setTimeout(clearRevealedIdentity, Math.max(expireAt - Date.now(), 0))
  }

  watch(
    () => [
      form.score,
      form.annotationNote,
      wholeQuestions.value.map((question) => {
        const qForm = getWholeQuestionForm(question.questionTemplateId)
        return [qForm.score, qForm.annotationText] as const
      }),
      Object.entries(wholePageAnnotationForms).map(([pageId, text]) => [pageId, text] as const),
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
    loading,
    form,
    isExamConfidential,
    examConfidentialLabel,
    examWatermarkLines,
    isExamOwner,
    isReadOnly,
    isScoreReadOnly,
    taskRecycledBlocked,
    sessionPausedAlert,
    withdrawToastVisible,
    latestWithdrawable,
    recentList,
    canWithdrawEntry,
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
    rescoringGradeResultId,
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
    focusWholeQuestionPage,
    openRescoreConfirmForQuestionView,
    openRescoreConfirmForWholeQuestion,
    openExecutionsDrawerForQuestionView,
    openRevealDialog,
    handleAnonymousRevealed,
    aiAbilityLabel,
    aiAbilityTone,
    aiExecutionStatusLabel,
    aiExecutionStatusTone,
    aiExecutionTimelineColor,
  }
}
