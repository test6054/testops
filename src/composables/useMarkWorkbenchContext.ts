import type { InjectionKey, Ref } from 'vue'
import type { ExamDetailVO } from '@/apis/mark/exam'
import type { MarkingProgressVO, WorkbenchStageSnapshotVO } from '@/apis/mark/exam-progress'
import type { useExamWorkspaceChrome } from '@/composables/useExamWorkspaceChrome'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { computed, inject, provide } from 'vue'
import { useRoute } from 'vue-router'

export type ExamWorkspaceChromeContext = ReturnType<typeof useExamWorkspaceChrome>

export interface MarkWorkbenchContext {
  examId: Ref<string>
  selectedExamId: Ref<string>
  snapshot: Ref<WorkbenchStageSnapshotVO | null>
  loading: Ref<boolean>
  refreshing: Ref<boolean>
  refreshSnapshot: () => Promise<void>
  /** 布局级加载的考试详情，子页可复用避免重复请求 */
  examDetail?: Ref<ExamDetailVO | null>
  examDetailLoading?: Ref<boolean>
  /** 阅卷进度：优先 snapshot 内嵌，与布局 Chrome 同源 */
  markingProgress?: Ref<MarkingProgressVO | null>
  refreshChrome?: () => Promise<void>
  /** 子页未保存提示；非空时离开工作台需确认 */
  workspaceUnsavedHint?: Ref<string | null>
}

export const MARK_WORKBENCH_CONTEXT_KEY: InjectionKey<MarkWorkbenchContext> = Symbol('markWorkbenchContext')

export const EXAM_WORKSPACE_CHROME_KEY: InjectionKey<ExamWorkspaceChromeContext> = Symbol('examWorkspaceChrome')

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

export function useExamWorkspaceChromeContext(): ExamWorkspaceChromeContext {
  const context = inject(EXAM_WORKSPACE_CHROME_KEY, null)
  if (!context) {
    throw new Error('useExamWorkspaceChromeContext 必须在 exam-workspace-layout 子树内使用')
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
