import type { InjectionKey, Ref } from 'vue'
import type { WorkbenchStageSnapshotVO } from '@/apis/mark/exam-progress'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { computed, inject, provide } from 'vue'
import { useRoute } from 'vue-router'

export interface MarkWorkbenchContext {
  examId: Ref<string>
  selectedExamId: Ref<string>
  snapshot: Ref<WorkbenchStageSnapshotVO | null>
  loading: Ref<boolean>
  refreshing: Ref<boolean>
  refreshSnapshot: () => Promise<void>
}

export const MARK_WORKBENCH_CONTEXT_KEY: InjectionKey<MarkWorkbenchContext> = Symbol('markWorkbenchContext')

export function provideMarkWorkbenchContext(context: MarkWorkbenchContext): MarkWorkbenchContext {
  provide(MARK_WORKBENCH_CONTEXT_KEY, context)
  return context
}

export function useMarkWorkbenchContext(): MarkWorkbenchContext {
  const context = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  if (!context) {
    throw new Error('useMarkWorkbenchContext 必须在 exam-workspace-layout 子树内使用')
  }
  return context
}

/** 子页读取当前考试 ID；layout 内优先 inject，否则回退 route.params.examId */
export function useWorkspaceExamId() {
  const injected = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
  if (injected) {
    return {
      examId: injected.examId,
      selectedExamId: injected.selectedExamId,
      refreshSnapshot: injected.refreshSnapshot,
    }
  }
  const route = useRoute()
  const examId = computed(() => String(route.params.examId ?? ''))
  return {
    examId,
    selectedExamId: examId,
    refreshSnapshot: async () => {},
  }
}

export type { MarkStageKey }
