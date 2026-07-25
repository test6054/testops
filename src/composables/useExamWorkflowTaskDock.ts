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
import { MARK_STAGE_TITLE, shouldShowStageSuggestionBanner } from '@/constants/mark-workspace-nav'
import { WorkbenchNextActionKeyCode } from '@/types/enums/exam-workbench-next-action-key-enum'
import { MarkTeacherDashboardTodoTypeCode } from '@/types/enums/mark-teacher-dashboard-todo-type-enum'
import {
  buildExperienceAssistCalibrationDockView,
  findExperienceAssistCalibrationAction,
  isExperienceAssistCalibrationActionPending,
  resolveExperienceAssistCalibrationPendingCount,
} from '@/utils/exam-workflow-next-action'
import { resolveNextActionRouteName } from '@/utils/exam-workspace-entry-gates'

export type {
  ExamWorkflowTaskDockKind,
  ExamWorkflowTaskDockView,
} from '@/types/exam-workflow-task-dock'

/** 从 nextActions 优先、pendingTodos 回退读取试评经验定标待办数。 */
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
  suggestedStageKey: ComputedRef<MarkStageKey | null | undefined>
  activeMarkStageKey: ComputedRef<MarkStageKey | null>
  stageSuggestionDescription: ComputedRef<string>
  suggestedStageActionLabel: ComputedRef<string>
  goSuggestedStageByKey: () => void
}

/**
 * 考试工作台悬浮任务条：试评定标消费 nextActions，阶段建议仍由旅程快照驱动。
 */
export function useExamWorkflowTaskDock(options: UseExamWorkflowTaskDockOptions) {
  const router = useRouter()
  const dismissedKinds = ref<Set<ExamWorkflowTaskDockKind>>(new Set())

  const calibrationAction = computed(() =>
    findExperienceAssistCalibrationAction(options.nextActions.value),
  )

  function syncDismissedFromSession(): void {
    const examId = options.examId.value
    const next = new Set<ExamWorkflowTaskDockKind>()
    if (readSessionDismissed(examId, 'experience-assist')) {
      next.add('experience-assist')
    }
    if (readSessionDismissed(examId, 'stage-suggestion')) {
      next.add('stage-suggestion')
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
    return shouldShowStageSuggestionBanner(active, suggested)
  })

  watch(
    () => isExperienceAssistCalibrationActionPending(calibrationAction.value),
    (pending) => {
      if (pending) {
        return
      }
      if (!dismissedKinds.value.has('experience-assist')) {
        return
      }
      clearSessionDismissed(options.examId.value, 'experience-assist')
      const next = new Set(dismissedKinds.value)
      next.delete('experience-assist')
      dismissedKinds.value = next
    },
  )

  watch(showStageSuggestion, (visible) => {
    if (visible) {
      return
    }
    if (!dismissedKinds.value.has('stage-suggestion')) {
      return
    }
    clearSessionDismissed(options.examId.value, 'stage-suggestion')
    const next = new Set(dismissedKinds.value)
    next.delete('stage-suggestion')
    dismissedKinds.value = next
  })

  const experienceAssistTask = computed((): ExamWorkflowTaskDockView | null => {
    if (options.isImmersiveWorkspace.value) {
      return null
    }
    const action = calibrationAction.value
    if (!isExperienceAssistCalibrationActionPending(action)) {
      return null
    }
    const targetRoute = resolveNextActionRouteName(
      WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION,
      options.examId.value,
    )
    if (options.route.name === targetRoute) {
      return null
    }
    if (dismissedKinds.value.has('experience-assist')) {
      return null
    }
    return buildExperienceAssistCalibrationDockView(action)
  })

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

    const suggestedKey = options.suggestedStageKey.value
    if (!suggestedKey) {
      return null
    }

    return {
      kind: 'stage-suggestion',
      title: `建议下一步：${MARK_STAGE_TITLE[suggestedKey]}`,
      description: options.stageSuggestionDescription.value,
      actionLabel:
        options.suggestedStageActionLabel.value || `前往${MARK_STAGE_TITLE[suggestedKey]}`,
    }
  })

  const activeTask = computed(
    (): ExamWorkflowTaskDockView | null => experienceAssistTask.value ?? stageSuggestionTask.value,
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
    if (!task) {
      return
    }
    if (task.kind === 'experience-assist') {
      const action = calibrationAction.value
      if (!action || !options.examId.value) {
        return
      }
      void router.push({
        name: resolveNextActionRouteName(
          WorkbenchNextActionKeyCode.EXPERIENCE_ASSIST_CALIBRATION,
          options.examId.value,
        ),
        params: { examId: options.examId.value },
      })
      return
    }
    options.goSuggestedStageByKey()
  }

  return {
    activeTask,
    showTaskDock,
    dismissActiveTask,
    runActiveTaskAction,
  }
}
