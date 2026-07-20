import type {ComputedRef, Ref} from 'vue';
import type {PortfolioTeacherLifecycleStateVO} from '@/apis/portfolio/teacher-lifecycle';
/**
 * 教师生命周期档案写禁：封存/迁出等状态下前端预禁写操作。
 * 后端 assertArchiveWritable 仍是权威；本 composable 仅提升体验，不替代服务端守卫。
 */
import { computed, ref, watch } from 'vue'
import {
  portfolioTeacherLifecycleApi
  
} from '@/apis/portfolio/teacher-lifecycle'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { showFormValidationMessage } from '@/utils/error-handler'

export interface PortfolioArchiveWriteGuardOptions {
  /** 覆盖目标教师；默认 page scope 的 targetTeacherId */
  teacherId?: Ref<string | undefined> | ComputedRef<string | undefined>
  /** 是否在 teacherId 变化时自动拉取；默认 true */
  autoLoad?: boolean
}

export function usePortfolioArchiveWriteGuard(options?: PortfolioArchiveWriteGuardOptions) {
  const { targetTeacherId, currentUserId } = usePortfolioPageScope()
  const teacherIdSource = options?.teacherId
  const autoLoad = options?.autoLoad ?? true

  const resolvedTeacherId = computed(() => {
    const override = teacherIdSource?.value
    if (override != null && String(override).trim() !== '') {
      return String(override)
    }
    if (targetTeacherId.value) {
      return String(targetTeacherId.value)
    }
    return currentUserId.value ? String(currentUserId.value) : ''
  })

  const lifecycleState = ref<PortfolioTeacherLifecycleStateVO | null>(null)
  const loading = ref(false)
  const loadFailed = ref(false)

  const archiveWriteForbidden = computed(() => Boolean(lifecycleState.value?.archiveWriteForbidden))
  const evaluationHeld = computed(() => Boolean(lifecycleState.value?.evaluationHeld))
  const lifecycleStatusLabel = computed(
    () => lifecycleState.value?.lifecycleStatusLabel || lifecycleState.value?.lifecycleStatus || '',
  )
  const archiveWriteBlockMessage = computed(() => {
    if (!archiveWriteForbidden.value) {
      return ''
    }
    const status = lifecycleStatusLabel.value || '非在职'
    return `教师生命周期为「${status}」，禁止档案填报与改写。历史档案只读可查。`
  })
  const evaluationHoldBlockMessage = computed(() => {
    if (!evaluationHeld.value) {
      return ''
    }
    const status = lifecycleStatusLabel.value || '非在职'
    return `教师生命周期为「${status}」，禁止参与进行中评价（含材料确认与异议）。`
  })

  async function reloadLifecycleState(): Promise<void> {
    const teacherUserId = resolvedTeacherId.value
    if (!teacherUserId) {
      lifecycleState.value = null
      loadFailed.value = false
      return
    }
    loading.value = true
    loadFailed.value = false
    try {
      const state = await portfolioTeacherLifecycleApi.get({ teacherUserId })
      lifecycleState.value = state ?? null
    } catch {
      // 拉取失败时不假成功放行：保持上次状态；首次失败则视为未知，assert 时再提示
      loadFailed.value = true
      lifecycleState.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * 写操作前调用：若写禁则提示并返回 false。
   */
  function assertArchiveWritable(actionLabel?: string): boolean {
    if (archiveWriteForbidden.value) {
      const suffix = actionLabel ? `（${actionLabel}）` : ''
      showFormValidationMessage(archiveWriteBlockMessage.value + suffix)
      return false
    }
    // 拉取失败不前端硬拦：以后端 assertArchiveWritable 为权威，避免可用性误伤
    return true
  }

  function assertEvaluationParticipable(actionLabel?: string): boolean {
    if (evaluationHeld.value) {
      const suffix = actionLabel ? `（${actionLabel}）` : ''
      showFormValidationMessage(evaluationHoldBlockMessage.value + suffix)
      return false
    }
    return true
  }

  if (autoLoad) {
    watch(
      resolvedTeacherId,
      () => {
        void reloadLifecycleState()
      },
      { immediate: true },
    )
  }

  return {
    resolvedTeacherId,
    lifecycleState,
    loading,
    loadFailed,
    archiveWriteForbidden,
    evaluationHeld,
    lifecycleStatusLabel,
    archiveWriteBlockMessage,
    evaluationHoldBlockMessage,
    reloadLifecycleState,
    assertArchiveWritable,
    assertEvaluationParticipable,
  }
}
