/**
 * URL 状态同步 composable
 *
 * 设计目标：把列表筛选、分页、当前阶段等关键业务上下文持久化到 URL query，
 * 满足设计文档「URL 状态」一节：
 * - 考试 ID / 专业 ID / 学年 / 课程 ID / 当前阶段 / 列表筛选 / 分页
 * - 支持复制 URL 直达同一筛选状态
 *
 * 使用方式：
 * ```ts
 * import { useUrlState } from '@/composables/useUrlState'
 *
 * const {
 *   model,
 *   reset,
 *   commit,
 * } = useUrlState({
 *   initial: { keyword: '', status: undefined as string | undefined, pageNum: 1 },
 *   keys: ['keyword', 'status', 'pageNum'],
 *   transformIn: { pageNum: (v) => Number(v) || 1 },
 * })
 * // model.value 是 reactive 状态，commit() 把 model 写到 URL
 * ```
 *
 * - 不在每次 model 变化时同步到 URL，避免抖动；通过显式 commit() 触发。
 * - 支持 transformIn / transformOut 完成 URL 字符串 ⇄ 业务类型转换。
 */
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import { reactive, watch } from 'vue'

export interface UrlStateOptions<TState extends Record<string, unknown>> {
  /** 初始状态对象，决定 model 字段集 */
  initial: TState
  /** 哪些 key 进入 URL；未列出的 key 不参与 URL 同步 */
  keys: ReadonlyArray<keyof TState>
  /** URL → state 的反向转换（如字符串转数字） */
  transformIn?: { [K in keyof TState]?: (raw: string | string[] | undefined) => TState[K] }
  /** state → URL 的正向转换（默认 String / 数组用逗号） */
  transformOut?: { [K in keyof TState]?: (value: TState[K]) => string | string[] | undefined }
  /** 是否在 mount 时把 URL 解析回 model（默认 true） */
  hydrateFromUrl?: boolean
}

export interface UrlStateHandle<TState extends Record<string, unknown>> {
  /** reactive 状态；用于双向绑定到表单 */
  model: TState
  /** 把 model 写回 URL（push 模式，记录历史） */
  commit: () => void
  /** 把 model 写回 URL（replace 模式，不记录历史） */
  commitReplace: () => void
  /** 重置 model 为初始值，并把 URL 同步为空 */
  reset: () => void
  /** 把当前 URL 同步回 model */
  hydrate: () => void
}

const DEFAULT_TRANSFORM_OUT = <T,>(value: T): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (Array.isArray(value)) {
    return value.length === 0 ? undefined : value.map(String).join(',')
  }
  return String(value)
}

const DEFAULT_TRANSFORM_IN = <T,>(raw: string | string[] | undefined): T | undefined => {
  if (raw === undefined) return undefined
  if (Array.isArray(raw)) return undefined as T | undefined
  return raw as unknown as T
}

export function useUrlState<TState extends Record<string, unknown>>(
  options: UrlStateOptions<TState>,
): UrlStateHandle<TState> {
  const { initial, keys, transformIn, transformOut, hydrateFromUrl = true } = options
  const route = useRoute()
  const router = useRouter()

  const model = reactive({ ...initial }) as TState

  function applyHydrate(): void {
    for (const key of keys) {
      const raw = route.query[String(key)]
      const fn = transformIn?.[key]
      const value = fn !== undefined
        ? fn(Array.isArray(raw) ? (raw.filter((v): v is string => typeof v === 'string')) : (raw === null ? undefined : raw))
        : DEFAULT_TRANSFORM_IN<TState[typeof key]>(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : (raw === null ? undefined : raw))
      if (value !== undefined) {
        Object.assign(model, { [key]: value })
      }
    }
  }

  function buildQuery(): LocationQueryRaw {
    const next: Record<string, string | string[] | undefined> = { ...route.query }
    for (const key of keys) {
      const value = (model as Record<string, unknown>)[String(key)]
      const fn = transformOut?.[key]
      const out = fn !== undefined ? fn(value as TState[typeof key]) : DEFAULT_TRANSFORM_OUT(value)
      if (out === undefined) {
        delete next[String(key)]
      }
      else {
        next[String(key)] = out
      }
    }
    return next
  }

  function commit(): void {
    const query = buildQuery()
    void router.push({ path: route.path, query })
  }

  function commitReplace(): void {
    const query = buildQuery()
    void router.replace({ path: route.path, query })
  }

  function reset(): void {
    Object.assign(model, initial)
    commitReplace()
  }

  function hydrate(): void {
    applyHydrate()
  }

  if (hydrateFromUrl) {
    applyHydrate()
  }

  watch(
    () => route.query,
    () => {
      // 外部触发的 URL 变化（如浏览器返回）需要把 URL 同步回 model
      applyHydrate()
    },
    { flush: 'post' },
  )

  return { model, commit, commitReplace, reset, hydrate }
}
