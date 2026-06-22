import type { ComputedRef } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { ExamJourneyKey, ExamJourneyStepDef, ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
// MARK_STAGE_ORDER 导入已移除：resolveActiveJourneyKey 不再做 markStageKey 兜底
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  EXAM_JOURNEY_STEPS,
  isExamWorkspaceJourneyKey,
  resolveJourneyKeyByStage,
  resolveJourneyStep,
} from '@/constants/exam-journey'

export interface ExamJourneyState {
  journeyStages: ComputedRef<WorkbenchStage[]>
  activeJourneyKey: ComputedRef<ExamWorkspaceJourneyKey>
  resolveStageJourney: (stageKey: MarkStageKey) => ExamJourneyKey
}

const STATUS_PRIORITY: Record<WorkbenchStageStatus, number> = {
  error: 5,
  blocked: 5,
  warning: 4,
  active: 3,
  completed: 2,
  pending: 1,
}

/**
 * 聚合子阶段状态为旅程状态：error/blocked > warning > active > completed > pending。
 */
function aggregateStatus(subStages: WorkbenchStage[]): WorkbenchStageStatus {
  if (subStages.length === 0) {
    return 'pending'
  }
  let best: WorkbenchStageStatus = 'pending'
  let bestPriority = 0
  for (const stage of subStages) {
    const priority = STATUS_PRIORITY[stage.status] ?? 0
    if (priority > bestPriority) {
      bestPriority = priority
      best = stage.status
    }
  }
  return best
}

/**
 * 取最高优先级子阶段的 statusText；同优先级拼接前 2 条；全部完成时为「已完成」。
 */
function buildJourneyStatusText(subStages: WorkbenchStage[], aggregatedStatus: WorkbenchStageStatus): string {
  if (subStages.length === 0) {
    return '待开始'
  }
  if (aggregatedStatus === 'completed' && subStages.every((stage) => stage.status === 'completed')) {
    return '已完成'
  }
  const topPriority = STATUS_PRIORITY[aggregatedStatus] ?? 0
  const topStages = subStages.filter((stage) => (STATUS_PRIORITY[stage.status] ?? 0) === topPriority)
  const texts = topStages
    .map((stage) => {
      const text = stage.statusText?.trim()
      if (!text) {
        return null
      }
      if (topStages.length > 1) {
        return `${stage.title}：${text}`
      }
      return text
    })
    .filter((text): text is string => !!text)
  if (texts.length === 0) {
    return aggregatedStatus === 'pending' ? '待开始' : ''
  }
  return texts.slice(0, 2).join('；')
}

/** 将后端 9 段快照聚合为单个六步旅程 WorkbenchStage */
function buildJourneyStage(step: ExamJourneyStepDef, stageByKey: Map<string, WorkbenchStage>): WorkbenchStage {
  const subStages = step.stageKeys
    .map((key) => stageByKey.get(key))
    .filter((stage): stage is WorkbenchStage => !!stage)
  const status = aggregateStatus(subStages)
  const statusText = buildJourneyStatusText(subStages, status)
  return {
    key: step.key,
    title: step.title,
    status,
    statusText: statusText || undefined,
  }
}

/**
 * 解析当前路由所属旅程。
 *
 * journeyKey 由路由表静态声明（见 exam-workspace.ts 的 workspaceChild，编译期必填），
 * 是单一可信来源。此处只信任 meta.journeyKey，不做菜单反查或 markStageKey 映射兜底；
 * 缺失即抛错，暴露路由配置缺陷而非静默兜底。
 */
export function resolveActiveJourneyKey(route: RouteLocationNormalizedLoaded): ExamWorkspaceJourneyKey {
  if (isExamWorkspaceJourneyKey(route.meta.journeyKey)) {
    return route.meta.journeyKey
  }
  throw new Error(`路由 ${String(route.path)} 缺少有效 meta.journeyKey`)
}

/** 将后端 9 段快照聚合为教师可见 6 步旅程状态 */
export function useExamJourneySteps(orderedStages: ComputedRef<WorkbenchStage[]>): ExamJourneyState {
  const route = useRoute()
  const stageByKey = computed(() => new Map(orderedStages.value.map((stage) => [stage.key, stage])))

  const journeyStages = computed<WorkbenchStage[]>(() =>
    EXAM_JOURNEY_STEPS.map((step) => buildJourneyStage(step, stageByKey.value)),
  )

  const activeJourneyKey = computed<ExamWorkspaceJourneyKey>(() => resolveActiveJourneyKey(route))

  return {
    journeyStages,
    activeJourneyKey,
    resolveStageJourney: resolveJourneyKeyByStage,
  }
}

/** 获取建议细阶段所属旅程展示标题 */
export function resolveJourneyTitleForStage(stageKey: MarkStageKey): string {
  const journeyKey = resolveJourneyKeyByStage(stageKey)
  return resolveJourneyStep(journeyKey).title
}
