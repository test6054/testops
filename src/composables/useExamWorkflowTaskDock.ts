import type { ComputedRef } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { ExamWorkbenchNextActionResponse } from '@/apis/mark/exam-progress'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type {
  ExamWorkflowTaskDockKind,
  ExamWorkflowTaskDockView,
} from '@/types/exam-workflow-task-dock'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shouldShowStageSuggestionBanner } from '@/constants/mark-workspace-nav'
import { MarkTeacherDashboardTodoTypeCode } from '@/types/enums/mark-teacher-dashboard-todo-type-enum'
import {
  buildApprovePublishReviewDockView,
  buildExperienceAssistCalibrationDockView,
  buildSubmitPublishReviewDockView,
  findApprovePublishReviewAction,
  findExperienceAssistCalibrationAction,
  findSubmitPublishReviewAction,
  isApprovePublishReviewActionPending,
  isExperienceAssistCalibrationActionPending,
  isSubmitPublishReviewActionPending,
  resolveExperienceAssistCalibrationPendingCount,
} from '@/utils/exam-workflow-next-action'
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'

export type {
  ExamWorkflowTaskDockKind,
  ExamWorkflowTaskDockView,
} from '@/types/exam-workflow-task-dock'

/** 从 nextActions 读取试评经验定标待办数；缺 nextAction 时再读 pendingTodos 合同字段。 */
export function resolveExperienceAssistPendingCount(
  pendingTodos: { todoType: string, count?: number }[] | null | undefined,
  nextActions?: ExamWorkbenchNextActionResponse[] | null | undefined,
): number {
  const fromNextAction = resolveExperienceAssistCalibrationPendingCount(nextActions)
  if (fromNextAction > 0) {
    return fromNextAction
  }
  const item = pendingTodos?.find(
    (todo) => todo.todoType === MarkTeacherDashboardTodoTypeCode.EXPERIENCE_ASSIST_PENDING,
  )
  return item?.count ?? 0
}

const SESSION_DISMISS_PREFIX = 'mark-workflow-task-dismiss'

const DOCK_KINDS: readonly ExamWorkflowTaskDockKind[] = [
  'experience-assist',
  'approve-publish-review',
  'submit-publish-review',
  'stage-suggestion',
]

function dismissStorageKey(examId: string, kind: ExamWorkflowTaskDockKind): string {
  return `${SESSION_DISMISS_PREFIX}:${examId}:${kind}`
}

function readSessionDismissed(examId: string, kind: ExamWorkflowTaskDockKind): boolean {
  if (!examId) {
    return false
  }
  try {
    return sessionStorage.getItem(dismissStorageKey(examId, kind)) === '1'
  } catch {
    return false
  }
}

function writeSessionDismissed(examId: string, kind: ExamWorkflowTaskDockKind): void {
  if (!examId) {
    return
  }
  try {
    sessionStorage.setItem(dismissStorageKey(examId, kind), '1')
  } catch {
    // sessionStorage 不可用时忽略 dismiss
  }
}

function clearSessionDismissed(examId: string, kind: ExamWorkflowTaskDockKind): void {
  if (!examId) {
    return
  }
  try {
    sessionStorage.removeItem(dismissStorageKey(examId, kind))
  } catch {
    // sessionStorage 不可用时忽略
  }
}

export interface UseExamWorkflowTaskDockOptions {
  examId: ComputedRef<string>
  route: RouteLocationNormalizedLoaded
  isImmersiveWorkspace: ComputedRef<boolean>
  nextActions: ComputedRef<ExamWorkbenchNextActionResponse[]>
  /** 入口合同路由；阶段建议动作唯一跳转真源 */
  workspaceRouteName: ComputedRef<string | null | undefined>
  /** 入口合同文案 */
  enterActionLabel: ComputedRef<string | null | undefined>
  suggestedStageKey: ComputedRef<MarkStageKey | null | undefined>
  activeMarkStageKey: ComputedRef<MarkStageKey | null>
  stageSuggestionDescription: ComputedRef<string>
}

/**
 * 考试工作台悬浮任务条：定标 / 签审 / 提交复核消费 nextActions；阶段建议只认入口合同。
 */
export function useExamWorkflowTaskDock(options: UseExamWorkflowTaskDockOptions) {
  const router = useRouter()
  const dismissedKinds = ref<Set<ExamWorkflowTaskDockKind>>(new Set())

  const calibrationAction = computed(() =>
    findExperienceAssistCalibrationAction(options.nextActions.value),
  )
  const approvePublishReviewAction = computed(() =>
    findApprovePublishReviewAction(options.nextActions.value),
  )
  const submitPublishReviewAction = computed(() =>
    findSubmitPublishReviewAction(options.nextActions.value),
  )

  function syncDismissedFromSession(): void {
    const examId = options.examId.value
    const next = new Set<ExamWorkflowTaskDockKind>()
    for (const kind of DOCK_KINDS) {
      if (readSessionDismissed(examId, kind)) {
        next.add(kind)
      }
    }
    dismissedKinds.value = next
  }

  watch(options.examId, syncDismissedFromSession, { immediate: true })

  const showStageSuggestion = computed(() => {
    const suggested = options.suggestedStageKey.value
    const active = options.activeMarkStageKey.value
    if (!suggested || !active) {
      return false
    }
    const routeName = options.workspaceRouteName.value?.trim()
    const actionLabel = options.enterActionLabel.value?.trim()
    if (!routeName || !actionLabel) {
      return false
    }
    return shouldShowStageSuggestionBanner(active, suggested)
  })

  function clearDismissWhenInactive(kind: ExamWorkflowTaskDockKind, pending: boolean): void {
    if (pending) {
      return
    }
    if (!dismissedKinds.value.has(kind)) {
      return
    }
    clearSessionDismissed(options.examId.value, kind)
    const next = new Set(dismissedKinds.value)
    next.delete(kind)
    dismissedKinds.value = next
  }

  watch(
    () => isExperienceAssistCalibrationActionPending(calibrationAction.value),
    (pending) => clearDismissWhenInactive('experience-assist', pending),
  )
  watch(
    () => isApprovePublishReviewActionPending(approvePublishReviewAction.value),
    (pending) => clearDismissWhenInactive('approve-publish-review', pending),
  )
  watch(
    () => isSubmitPublishReviewActionPending(submitPublishReviewAction.value),
    (pending) => clearDismissWhenInactive('submit-publish-review', pending),
  )
  watch(showStageSuggestion, (visible) => clearDismissWhenInactive('stage-suggestion', visible))

  function buildDockTask(
    kind: ExamWorkflowTaskDockKind,
    view: ExamWorkflowTaskDockView | null,
  ): ExamWorkflowTaskDockView | null {
    if (options.isImmersiveWorkspace.value) {
      return null
    }
    if (!view) {
      return null
    }
    if (dismissedKinds.value.has(kind)) {
      return null
    }
    if (!view.routeName?.trim()) {
      return null
    }
    if (options.route.name === view.routeName
      && (kind !== 'approve-publish-review' || options.route.query.pendingMyReview === '1')) {
      return null
    }
    return view
  }

  const experienceAssistTask = computed((): ExamWorkflowTaskDockView | null =>
    buildDockTask('experience-assist', buildExperienceAssistCalibrationDockView(calibrationAction.value)),
  )

  const approvePublishReviewTask = computed((): ExamWorkflowTaskDockView | null =>
    buildDockTask('approve-publish-review', buildApprovePublishReviewDockView(approvePublishReviewAction.value)),
  )

  const submitPublishReviewTask = computed((): ExamWorkflowTaskDockView | null =>
    buildDockTask('submit-publish-review', buildSubmitPublishReviewDockView(submitPublishReviewAction.value)),
  )

  const stageSuggestionTask = computed((): ExamWorkflowTaskDockView | null => {
    if (options.isImmersiveWorkspace.value) {
      return null
    }
    if (!showStageSuggestion.value) {
      return null
    }
    if (dismissedKinds.value.has('stage-suggestion')) {
      return null
    }
    const routeName = options.workspaceRouteName.value?.trim()
    const actionLabel = options.enterActionLabel.value?.trim()
    if (!routeName || !actionLabel) {
      return null
    }
    if (options.route.name === routeName) {
      return null
    }
    return {
      kind: 'stage-suggestion',
      title: `建议下一步：${actionLabel}`,
      description: options.stageSuggestionDescription.value,
      actionLabel,
      routeName,
    }
  })

  const activeTask = computed((): ExamWorkflowTaskDockView | null =>
    experienceAssistTask.value
    ?? approvePublishReviewTask.value
    ?? submitPublishReviewTask.value
    ?? stageSuggestionTask.value,
  )

  const showTaskDock = computed(() => activeTask.value != null)

  function dismissActiveTask(): void {
    const task = activeTask.value
    if (!task || !options.examId.value) {
      return
    }
    writeSessionDismissed(options.examId.value, task.kind)
    dismissedKinds.value = new Set([...dismissedKinds.value, task.kind])
  }

  function runActiveTaskAction(): void {
    const task = activeTask.value
    if (!task || !options.examId.value) {
      return
    }
    const routeName = task.routeName?.trim()
    if (!routeName) {
      throw new Error(`任务条缺少 routeName：${task.kind}`)
    }
    const query = task.openPendingMyPublishReview === true
      ? { pendingMyReview: '1' }
      : undefined
    const contractLabel = task.kind === 'experience-assist'
      ? '定标任务条入口'
      : task.kind === 'approve-publish-review'
        ? '签审任务条入口'
        : task.kind === 'submit-publish-review'
          ? '提交发布复核任务条入口'
          : '阶段建议任务条入口'
    navigateExamWorkspaceRoute(
      router,
      routeName,
      { examId: options.examId.value },
      contractLabel,
      query,
    )
  }

  return {
    activeTask,
    showTaskDock,
    dismissActiveTask,
    runActiveTaskAction,
  }
}
