import type { InjectionKey } from 'vue'
import type { MarkExamSelectorOptions } from '@/composables/useMarkExamSelector'
import { inject, provide } from 'vue'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

export type MarkExamContext = ReturnType<typeof useMarkExamSelector>

const MARK_EXAM_CONTEXT_KEY: InjectionKey<MarkExamContext> = Symbol('markExamContext')

/**
 * 在页面 setup 顶层注入考试上下文，供 MarkExamContextPicker / MarkExamStageRail 共享同一选择器实例。
 */
export function provideMarkExamContext(options?: MarkExamSelectorOptions): MarkExamContext {
  const context = useMarkExamSelector(options)
  provide(MARK_EXAM_CONTEXT_KEY, context)
  return context
}

/**
 * 读取考试上下文：优先 inject，否则回退为页面级独立 useMarkExamSelector。
 */
export function useMarkExamContext(options?: MarkExamSelectorOptions): MarkExamContext {
  const injected = inject(MARK_EXAM_CONTEXT_KEY, null)
  if (injected) {
    return injected
  }
  return useMarkExamSelector(options)
}

/** MarkExamContextPicker 专用：必须在 provideMarkExamContext 作用域内使用 */
export function useMarkExamContextPicker(): MarkExamContext {
  const injected = inject(MARK_EXAM_CONTEXT_KEY, null)
  if (!injected) {
    throw new Error('MarkExamContextPicker 需要在调用 provideMarkExamContext() 的页面内使用')
  }
  return injected
}
