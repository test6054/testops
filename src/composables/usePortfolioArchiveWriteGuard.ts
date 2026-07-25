import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { PortfolioTeacherLifecycleStateVO } from '@/apis/portfolio/teacher-lifecycle'
import { portfolioTeacherLifecycleApi } from '@/apis/portfolio/teacher-lifecycle'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { showFormValidationMessage } from '@/utils/error-handler'
import { portfolioLifecycleStatusDisplay } from '@/utils/portfolio-lifecycle-tag'

/**
 * 教师生命周期档案写禁：封存/迁出等状态下前端预禁写操作。
 * 能力未知（拉取失败）时前端 fail-closed；后端 assertArchiveWritable 仍是权威。
 */

export interface PortfolioArchiveWriteGuardOptions {
  /** 覆盖目标教师；默认 page scope 的 targetTeacherId */
  teacherId?: Ref<string | undefined> | ComputedRef<string | undefined>
  /** 是否在 teacherId 变化时自动拉取；默认 true */
  autoLoad?: boolean
}

function formatCapabilityClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
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
  const lastSuccessAt = ref<string | null>(null)

  /** 能力未知（拉取失败）时也视为禁止写入，避免页面继续展示可写。 */
  const archiveWriteCapabilityUnknown = computed(() => loadFailed.value)
  const archiveWriteForbidden = computed(
    () => loadFailed.value || Boolean(lifecycleState.value?.archiveWriteForbidden),
  )
  const evaluationHeld = computed(() => Boolean(lifecycleState.value?.evaluationHeld))
  /** 展示唯一真源：PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL；无状态为空串。 */
  const lifecycleStatusDisplay = computed(() => {
    const status = lifecycleState.value?.lifecycleStatus
    return status ? portfolioLifecycleStatusDisplay(status) : ''
  })
  const archiveWriteBlockMessage = computed(() => {
    if (loadFailed.value) {
      const staleHint = lastSuccessAt.value
        ? `上次成功确认 ${formatCapabilityClock(lastSuccessAt.value)}，当前能力未知。`
        : '当前尚未成功确认教师生命周期状态。'
      return `教师生命周期状态未知，禁止档案填报与改写。${staleHint}请重新确认教师状态后再操作。`
    }
    if (!lifecycleState.value?.archiveWriteForbidden) {
      return ''
    }
    if (!lifecycleState.value.lifecycleStatus) {
      throw new Error('枚举合同不同步：写禁态缺少教师生命周期状态')
    }
    const status = portfolioLifecycleStatusDisplay(lifecycleState.value.lifecycleStatus)
    return `教师生命周期为「${status}」，禁止档案填报与改写。历史档案只读可查。`
  })
  const evaluationHoldBlockMessage = computed(() => {
    if (loadFailed.value) {
      return '教师生命周期状态未知，禁止参与进行中评价。请重新确认教师状态后再操作。'
    }
    if (!evaluationHeld.value) {
      return ''
    }
    if (!lifecycleState.value?.lifecycleStatus) {
      throw new Error('枚举合同不同步：参评 hold 缺少教师生命周期状态')
    }
    const status = portfolioLifecycleStatusDisplay(lifecycleState.value.lifecycleStatus)
    return `教师生命周期为「${status}」，禁止参与进行中评价（含材料确认与异议）。`
  })

  /** 重新拉取教师生命周期写禁能力；失败保留上次成功状态，但前端写路径仍 fail-closed。 */
  async function reloadLifecycleState(): Promise<void> {
    const teacherUserId = resolvedTeacherId.value
    if (!teacherUserId) {
      lifecycleState.value = null
      loadFailed.value = false
      lastSuccessAt.value = null
      return
    }
    loading.value = true
    try {
      const state = await portfolioTeacherLifecycleApi.get({ teacherUserId })
      lifecycleState.value = state ?? null
      loadFailed.value = false
      lastSuccessAt.value = new Date().toISOString()
    } catch {
      loadFailed.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * 写操作前调用：写禁或生命周期能力未知时均阻断；不得在 loadFailed 时 fail-open。
   */
  function assertArchiveWritable(actionLabel?: string): boolean {
    if (loadFailed.value) {
      const suffix = actionLabel ? `（${actionLabel}）` : ''
      showFormValidationMessage(`教师生命周期状态未知，请重新确认后再操作${suffix}`)
      return false
    }
    if (lifecycleState.value?.archiveWriteForbidden) {
      const suffix = actionLabel ? `（${actionLabel}）` : ''
      showFormValidationMessage(archiveWriteBlockMessage.value + suffix)
      return false
    }
    return true
  }

  function assertEvaluationParticipable(actionLabel?: string): boolean {
    if (loadFailed.value) {
      const suffix = actionLabel ? `（${actionLabel}）` : ''
      showFormValidationMessage(`教师生命周期状态未知，请重新确认后再操作${suffix}`)
      return false
    }
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
    lastSuccessAt,
    archiveWriteCapabilityUnknown,
    archiveWriteForbidden,
    evaluationHeld,
    lifecycleStatusDisplay,
    archiveWriteBlockMessage,
    evaluationHoldBlockMessage,
    reloadLifecycleState,
    assertArchiveWritable,
    assertEvaluationParticipable,
  }
}
