import type { ComputedRef, Ref } from 'vue'
import type { Router } from 'vue-router'
import type {
  ExamWorkbenchNextActionResponse,
  MarkingProgressResponse,
} from '@/apis/mark/exam-progress'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import {
  countBlockingScanAttention,
  resolveNextActionRouteName,
  resolvePrimaryEnabledNextAction,
} from '@/utils/exam-workspace-entry-gates'
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'
import { navigateToMarkStage } from '@/utils/mark-stage-navigation'

export interface UseExamWorkbenchRecommendedActionsOptions {
  router: Router
  examId: Ref<string>
  nextActions: ComputedRef<ExamWorkbenchNextActionResponse[]>
  markingProgress: ComputedRef<MarkingProgressResponse | null | undefined>
  suggestedStageKey: ComputedRef<MarkStageKey | null | undefined>
  orderedStages: ComputedRef<WorkbenchStage[]>
}

/**
 * 考试概览推荐动作：扫描异常 > 后端 nextAction > 建议阶段 > 阅卷池。
 * 制卷/名册准备硬阻断已下线，不再参与推荐。
 */
export function useExamWorkbenchRecommendedActions(
  options: UseExamWorkbenchRecommendedActionsOptions,
) {
  const suggestedStage = computed(() => {
    const key = options.suggestedStageKey.value
    if (!key) {
      return null
    }
    return options.orderedStages.value.find((stage) => stage.key === key) ?? null
  })

  const primaryNextAction = computed(() =>
    resolvePrimaryEnabledNextAction(
      options.nextActions.value,
      options.suggestedStageKey.value,
    ),
  )

  const recommendedPrimaryLabel = computed(() => {
    const progress = options.markingProgress.value
    if (
      progress
      && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
    ) {
      return '处理扫描异常'
    }
    if (primaryNextAction.value?.label?.trim()) {
      return primaryNextAction.value.label.trim()
    }
    if (suggestedStage.value?.title) {
      return `前往${suggestedStage.value.title}`
    }
    return '进入阅卷'
  })

  const recommendedSecondaryLabel = computed(() => {
    const progress = options.markingProgress.value
    if (
      progress
      && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
    ) {
      return '扫描批次'
    }
    if (primaryNextAction.value?.actionKey === WorkbenchNextActionKeyCode.START_SCAN) {
      return '准备工作台'
    }
    return '扫描运营'
  })

  const recommendedSecondaryVisible = computed(() => Boolean(recommendedSecondaryLabel.value?.trim()))

  function goSuggestedStage(): void {
    const key = options.suggestedStageKey.value
    if (!key || !options.examId.value) {
      return
    }
    navigateToMarkStage(options.router, key, options.examId.value, {
      scanAttentionCount: options.markingProgress.value?.scanAttentionCount,
    })
  }

  function goMarkingTaskPool(): void {
    navigateExamWorkspaceRoute(
      options.router,
      'TeacherExamWorkspaceMarkingTaskPool',
      { examId: options.examId.value },
      '阅卷任务池入口',
    )
  }

  function goScanBatches(): void {
    navigateExamWorkspaceRoute(
      options.router,
      'TeacherExamWorkspaceScanBatches',
      { examId: options.examId.value },
      '扫描批次入口',
    )
  }

  function goPrepWorkbench(): void {
    navigateExamWorkspaceRoute(
      options.router,
      'TeacherExamWorkspacePrep',
      { examId: options.examId.value },
      '准备工作台入口',
    )
  }

  function goScanMonitor(): void {
    navigateExamWorkspaceRoute(
      options.router,
      'TeacherExamWorkspaceScanMonitor',
      { examId: options.examId.value },
      '扫描监控入口',
    )
  }

  function goScanOps(): void {
    navigateExamWorkspaceRoute(
      options.router,
      'TeacherExamWorkspaceScanOps',
      { examId: options.examId.value },
      '扫描运营入口',
    )
  }

  function runRecommendedPrimaryAction(): void {
    if (!options.examId.value) {
      return
    }
    const progress = options.markingProgress.value
    if (
      progress
      && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
    ) {
      goScanMonitor()
      return
    }
    const action = primaryNextAction.value
    if (action) {
      navigateExamWorkspaceRoute(
        options.router,
        resolveNextActionRouteName(
          action.actionKey,
          options.examId.value,
          progress?.scanAttentionCount,
        ),
        { examId: options.examId.value },
        '工作台推荐动作',
      )
      return
    }
    if (options.suggestedStageKey.value) {
      goSuggestedStage()
      return
    }
    goMarkingTaskPool()
  }

  function runRecommendedSecondaryAction(): void {
    if (!options.examId.value) {
      return
    }
    const progress = options.markingProgress.value
    if (
      progress
      && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
    ) {
      goScanBatches()
      return
    }
    if (primaryNextAction.value?.actionKey === WorkbenchNextActionKeyCode.START_SCAN) {
      goPrepWorkbench()
      return
    }
    goScanOps()
  }

  return {
    recommendedPrimaryLabel,
    recommendedSecondaryLabel,
    recommendedSecondaryVisible,
    runRecommendedPrimaryAction,
    runRecommendedSecondaryAction,
  }
}
