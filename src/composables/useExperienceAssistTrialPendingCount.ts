import { computed, inject } from 'vue'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { MarkTeacherDashboardTodoTypeCode } from '@/types/enums/mark-teacher-dashboard-todo-type-enum'

/** 试评阶段经验定标待办数：仅读工作台快照 pendingTodos，与后端 countExperienceAssistPendingItems 同口径。 */
export function useExperienceAssistTrialPendingCount() {
  const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)

  const trialSessionActive = computed(() => workbenchContext?.snapshot.value?.trialSessionActive === true)

  const pendingCount = computed(() => {
    const todos = workbenchContext?.snapshot.value?.dashboardPanel?.pendingTodos ?? []
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
