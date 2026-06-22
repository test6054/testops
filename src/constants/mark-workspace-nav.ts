import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type {MarkStageKey} from '@/stores/modules/markStage';
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { MARK_STAGE_ORDER } from '@/stores/modules/markStage'

/** 阶段默认子路由：StageRail / 智能入口跳转目标（SCAN 阶段请用 resolveScanStageEntryRoute 动态分流） */
export const MARK_STAGE_DEFAULT_ROUTE: Record<MarkStageKey, string> = {
  EXAM_PREP: 'TeacherExamWorkspacePrep',
  PAPER_TEMPLATE: 'TeacherExamWorkspacePaperTemplate',
  CANDIDATE_ROSTER: 'TeacherExamWorkspaceCandidateRoster',
  SCAN: 'TeacherExamWorkspaceScanBatches',
  MARKING_ORG: 'TeacherExamWorkspaceMarkingOrg',
  TRIAL_MARKING: 'TeacherExamWorkspaceTrialTaskPool',
  FORMAL_MARKING: 'TeacherExamWorkspaceMarkingTaskPool',
  SCORE_PUBLISH: 'TeacherExamWorkspaceScoreSummary',
  ARCHIVE: 'TeacherExamWorkspaceArchivePackage',
}

/** 阶段状态短标签：侧栏分组标题旁展示 */
export const WORKSPACE_STAGE_STATUS_LABEL: Record<WorkbenchStageStatus, string> = {
  pending: '待开始',
  active: '进行中',
  completed: '已完成',
  warning: '待完善',
  error: '异常',
  blocked: '阻塞',
}

export const WORKSPACE_STAGE_STATUS_TONE: Record<WorkbenchStageStatus, BadgeTone> = {
  pending: 'gray',
  active: 'blue',
  completed: 'green',
  warning: 'orange',
  error: 'red',
  blocked: 'red',
}

export function resolveWorkspaceStage(
  stages: WorkbenchStage[],
  markStageKey: MarkStageKey,
): WorkbenchStage | undefined {
  return stages.find((item) => item.key === markStageKey)
}

/**
 * 建议阶段横幅是否应展示：用户已进入后续阶段时不占位提示，避免在成绩/归档页重复出现前序建议。
 */
export function shouldShowStageSuggestionBanner(
  activeStageKey: MarkStageKey,
  suggestedStageKey: MarkStageKey,
): boolean {
  if (activeStageKey === suggestedStageKey) {
    return false
  }
  const activeIndex = MARK_STAGE_ORDER.indexOf(activeStageKey)
  const suggestedIndex = MARK_STAGE_ORDER.indexOf(suggestedStageKey)
  if (activeIndex < 0 || suggestedIndex < 0) {
    throw new Error(`无法比较阶段序：${activeStageKey} / ${suggestedStageKey}`)
  }
  return activeIndex <= suggestedIndex
}
