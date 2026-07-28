import type { ComputedRef, Ref } from 'vue'
import type { Router } from 'vue-router'
import { computed } from 'vue'
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'

export interface UseExamWorkbenchRecommendedActionsOptions {
  router: Router
  examId: Ref<string>
  /** 概览主入口路由；与列表 / 仪表盘入口合同同源 */
  workspaceRouteName: ComputedRef<string | null | undefined>
  /** 概览主入口文案 */
  enterActionLabel: ComputedRef<string | null | undefined>
  /** 概览次入口路由；关考复盘可空 */
  secondaryWorkspaceRouteName: ComputedRef<string | null | undefined>
  /** 概览次入口文案；与 secondaryWorkspaceRouteName 同有同无 */
  secondaryEnterActionLabel: ComputedRef<string | null | undefined>
}

/**
 * 考试概览推荐动作：只认后端阶段快照入口合同，禁止进度/阶段启发。
 */
export function useExamWorkbenchRecommendedActions(
  options: UseExamWorkbenchRecommendedActionsOptions,
) {
  const recommendedPrimaryLabel = computed(() => {
    const label = options.enterActionLabel.value?.trim()
    if (!label) {
      throw new Error('考试概览缺少 enterActionLabel 合同字段')
    }
    return label
  })

  const recommendedSecondaryLabel = computed(() => {
    const label = options.secondaryEnterActionLabel.value?.trim()
    return label || ''
  })

  const recommendedSecondaryVisible = computed(() => {
    const route = options.secondaryWorkspaceRouteName.value?.trim()
    const label = options.secondaryEnterActionLabel.value?.trim()
    return Boolean(route && label)
  })

  function runRecommendedPrimaryAction(): void {
    if (!options.examId.value) {
      return
    }
    const routeName = options.workspaceRouteName.value?.trim()
    if (!routeName) {
      throw new Error('考试概览缺少 workspaceRouteName 合同字段')
    }
    navigateExamWorkspaceRoute(
      options.router,
      routeName,
      { examId: options.examId.value },
      '工作台概览主入口',
    )
  }

  function runRecommendedSecondaryAction(): void {
    if (!options.examId.value) {
      return
    }
    const routeName = options.secondaryWorkspaceRouteName.value?.trim()
    const label = options.secondaryEnterActionLabel.value?.trim()
    if (!routeName || !label) {
      throw new Error('考试概览次入口合同不完整')
    }
    navigateExamWorkspaceRoute(
      options.router,
      routeName,
      { examId: options.examId.value },
      '工作台概览次入口',
    )
  }

  return {
    recommendedPrimaryLabel,
    recommendedSecondaryLabel,
    recommendedSecondaryVisible,
    runRecommendedPrimaryAction,
    runRecommendedSecondaryAction,
  }
}
