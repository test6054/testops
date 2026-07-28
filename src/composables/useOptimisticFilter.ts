import type { Ref } from 'vue'
import { reactive, ref, toRaw } from 'vue'

export interface UseOptimisticFilterOptions<T extends Record<string, unknown>> {
  /** 初始筛选态（草稿 + 已应用） */
  initial: T
  /**
   * 应用筛选后的请求；成功则固化 applied，失败由本 hook 回滚 draft/applied。
   * 调用方不得在内部吞掉异常后继续当作成功。
   */
  onApply: (query: T) => Promise<void>
  /**
   * 失败回调：默认不 toast（由 onApply 内或调用方展示业务错误）。
   * 用于额外回滚页面侧派生状态。
   */
  onRollback?: (previous: T, error: unknown) => void
}

function cloneFilter<T extends Record<string, unknown>>(value: T): T {
  return { ...toRaw(value) } as T
}

/**
 * 筛选乐观更新：先提交 UI 筛选态，再后台请求；失败回滚到上次成功态。
 * 典型用法：FilterBar v-model 绑定 draft，search/reset 调 apply/reset。
 */
export function useOptimisticFilter<T extends Record<string, unknown>>(
  options: UseOptimisticFilterOptions<T>,
) {
  const draft = reactive(cloneFilter(options.initial)) as T
  const applied = ref(cloneFilter(options.initial)) as Ref<T>
  const previousApplied = ref(cloneFilter(options.initial)) as Ref<T>
  const applying = ref(false)
  let applySeq = 0

  /** 以当前 draft 作为乐观筛选态并发起请求；失败回滚 draft 与 applied */
  async function apply(): Promise<boolean> {
    const seq = ++applySeq
    const snapshot = cloneFilter(draft)
    previousApplied.value = cloneFilter(applied.value)
    applied.value = snapshot
    applying.value = true
    try {
      await options.onApply(cloneFilter(snapshot))
      if (seq !== applySeq) {
        return false
      }
      return true
    } catch (error) {
      if (seq !== applySeq) {
        return false
      }
      const rollbackTo = cloneFilter(previousApplied.value)
      Object.keys(draft).forEach((key) => {
        delete (draft as Record<string, unknown>)[key]
      })
      Object.assign(draft, rollbackTo)
      applied.value = rollbackTo
      options.onRollback?.(rollbackTo, error)
      return false
    } finally {
      if (seq === applySeq) {
        applying.value = false
      }
    }
  }

  /** 重置草稿与已应用态；默认回到 initial，可传入显式 next */
  function reset(next?: T): void {
    applySeq += 1
    const base = cloneFilter(next ?? options.initial)
    Object.keys(draft).forEach((key) => {
      delete (draft as Record<string, unknown>)[key]
    })
    Object.assign(draft, base)
    applied.value = cloneFilter(base)
    previousApplied.value = cloneFilter(base)
    applying.value = false
  }

  /** 仅同步草稿（不请求），用于外部回填 */
  function patchDraft(partial: Partial<T>): void {
    Object.assign(draft, partial)
  }

  return {
    draft,
    applied,
    applying,
    apply,
    reset,
    patchDraft,
  }
}
