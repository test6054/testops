import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ExamJourneyKey, ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import { resolveJourneyKeyByStage } from '@/constants/exam-journey'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { MARK_STAGE_ORDER } from '@/stores/modules/markStage'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { resolveJourneyIndex } from '@/utils/exam-workspace-entry-gates'

/** 九段主链标题，与后端 ExamWorkbenchStageKey 一致 */
export const MARK_STAGE_TITLE: Record<MarkStageKey, string> = {
  EXAM_PREP: '考试准备',
  PAPER_TEMPLATE: '模板制卷',
  CANDIDATE_ROSTER: '考生名册',
  SCAN: '扫描识别',
  MARKING_ORG: '阅卷组织',
  TRIAL_MARKING: '试评',
  FORMAL_MARKING: '正评',
  SCORE_PUBLISH: '成绩发布',
  ARCHIVE: '归档复盘',
}

/** 阶段默认子路由：StageRail / 智能入口跳转目标（SCAN 阶段请用 resolveScanStageEntryRoute 动态分流） */
export const MARK_STAGE_DEFAULT_ROUTE: Record<MarkStageKey, string> = {
  EXAM_PREP: 'TeacherExamWorkspacePrep',
  PAPER_TEMPLATE: 'TeacherExamWorkspaceLayoutDesigner',
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
 * 建议阶段横幅是否应展示。
 * <p>
 * 规则：仅在建议阶段严格位于当前阶段之后时展示用户"可以往前走"的建议。
 * 如果用户已进入成绩发布/归档阶段，前序未完成阶段不再弹出建议横幅。
 */
export function shouldShowStageSuggestionBanner(
  activeStageKey: MarkStageKey,
  suggestedStageKey: MarkStageKey,
): boolean {
  if (activeStageKey === suggestedStageKey) {
    return false
  }
  const activeJourney = resolveJourneyKeyByStage(activeStageKey)
  const suggestedJourney = resolveJourneyKeyByStage(suggestedStageKey)
  if (activeJourney === suggestedJourney) {
    return false
  }
  const activeIndex = MARK_STAGE_ORDER.indexOf(activeStageKey)
  const suggestedIndex = MARK_STAGE_ORDER.indexOf(suggestedStageKey)
  if (activeIndex < 0 || suggestedIndex < 0) {
    throw new Error(`无法比较阶段序：${activeStageKey} / ${suggestedStageKey}`)
  }
  return suggestedIndex > activeIndex
}

/**
 * 侧栏旅程「下一步」badge 是否展示：仅当建议阶段所属旅程严格位于当前旅程之后。
 * 当前旅程内待完善（如准备 2/4）不打 badge，由步骤卡片 warning 表达。
 */
export function shouldShowJourneySuggestion(
  activeJourneyKey: ExamWorkspaceJourneyKey,
  suggestedStageKey: MarkStageKey | null | undefined,
): boolean {
  if (!suggestedStageKey || activeJourneyKey === 'overview') {
    return suggestedStageKey != null && activeJourneyKey === 'overview'
  }
  const suggestedJourney = resolveJourneyKeyByStage(suggestedStageKey)
  if (activeJourneyKey === suggestedJourney) {
    return false
  }
  const activeIndex = resolveJourneyIndex(activeJourneyKey as ExamJourneyKey)
  const suggestedIndex = resolveJourneyIndex(suggestedJourney)
  if (activeIndex < 0 || suggestedIndex < 0) {
    throw new Error(`无法比较旅程序：${activeJourneyKey} / ${suggestedJourney}`)
  }
  return suggestedIndex > activeIndex
}
