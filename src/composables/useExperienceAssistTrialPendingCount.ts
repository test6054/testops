import { computed, inject } from 'vue'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { MarkTeacherDashboardTodoTypeCode } from '@/types/enums/mark-teacher-dashboard-todo-type-enum'
import { resolveExperienceAssistCalibrationPendingCount } from '@/utils/exam-workflow-next-action'

/** 试评阶段经验定标待办数：优先读 nextActions，与后端 countExperienceAssistPendingItems 同口径。 */
export function useExperienceAssistTrialPendingCount() {
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

  const trialSessionActive = computed(() => workbenchContext?.snapshot.value?.trialSessionActive === true)

  const pendingCount = computed(() => {
    const snapshot = workbenchContext?.snapshot.value
    const fromNextAction = resolveExperienceAssistCalibrationPendingCount(snapshot?.nextActions)
    if (fromNextAction > 0) {
      return fromNextAction
    }
    const todos = snapshot?.dashboardPanel?.pendingTodos ?? []
    const item = todos.find(
      (todo) => todo.todoType === MarkTeacherDashboardTodoTypeCode.EXPERIENCE_ASSIST_PENDING,
    )
    return item?.count ?? 0
  })

  return {
    pendingCount,
    trialSessionActive,
  }
}
