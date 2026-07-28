import type { RouteLocationRaw } from 'vue-router'
import type { MarkStageKey } from '@/stores/modules/markStage'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'

/** 教师可见六步旅程键（不含 overview） */
export type ExamJourneyKey = MarkTeacherDashboardJourneyKeyCode

/** 考试工作台旅程键，含概览入口 */
export type ExamWorkspaceJourneyKey = ExamJourneyKey | 'overview'

export interface ExamJourneyStepDef {
  key: ExamJourneyKey
  title: string
  stageKeys: readonly MarkStageKey[]
  defaultRouteName: string
}

/** 六步旅程定义：聚合后端 9 段 ExamWorkbenchStageKey */
export const EXAM_JOURNEY_STEPS: readonly ExamJourneyStepDef[] = [
  {
    key: MarkTeacherDashboardJourneyKeyCode.PREP,
    title: '创建与准备',
    stageKeys: ['EXAM_PREP', 'PAPER_TEMPLATE', 'CANDIDATE_ROSTER'],
    defaultRouteName: 'TeacherExamWorkspacePrep',
  },
  {
    key: MarkTeacherDashboardJourneyKeyCode.SCAN,
    title: '扫描识别',
    stageKeys: ['SCAN'],
    defaultRouteName: 'TeacherExamWorkspaceScanBatches',
  },
  {
    key: MarkTeacherDashboardJourneyKeyCode.ASSIGN,
    title: '阅卷安排',
    stageKeys: ['MARKING_ORG'],
    defaultRouteName: 'TeacherExamWorkspaceMarkingOrg',
  },
  {
    key: MarkTeacherDashboardJourneyKeyCode.MARK,
    title: '批阅',
    stageKeys: ['TRIAL_MARKING', 'FORMAL_MARKING'],
    defaultRouteName: 'TeacherExamWorkspaceMarkingTaskPool',
  },
  {
    key: MarkTeacherDashboardJourneyKeyCode.PUBLISH,
    title: '成绩发布',
    stageKeys: ['SCORE_PUBLISH'],
    defaultRouteName: 'TeacherExamWorkspaceScoreSummary',
  },
  {
    key: MarkTeacherDashboardJourneyKeyCode.ARCHIVE,
    title: '归档',
    stageKeys: ['ARCHIVE'],
    defaultRouteName: 'TeacherExamWorkspaceArchivePackage',
  },
]

const WORKSPACE_JOURNEY_KEYS: readonly ExamWorkspaceJourneyKey[] = [
  'overview',
  MarkTeacherDashboardJourneyKeyCode.PREP,
  MarkTeacherDashboardJourneyKeyCode.SCAN,
  MarkTeacherDashboardJourneyKeyCode.ASSIGN,
  MarkTeacherDashboardJourneyKeyCode.MARK,
  MarkTeacherDashboardJourneyKeyCode.PUBLISH,
  MarkTeacherDashboardJourneyKeyCode.ARCHIVE,
]

/** 判断 route.meta.journeyKey 是否为合法工作台旅程键 */
export function isExamWorkspaceJourneyKey(value: unknown): value is ExamWorkspaceJourneyKey {
  return value === 'overview'
    || value === MarkTeacherDashboardJourneyKeyCode.PREP
    || value === MarkTeacherDashboardJourneyKeyCode.SCAN
    || value === MarkTeacherDashboardJourneyKeyCode.ASSIGN
    || value === MarkTeacherDashboardJourneyKeyCode.MARK
    || value === MarkTeacherDashboardJourneyKeyCode.PUBLISH
    || value === MarkTeacherDashboardJourneyKeyCode.ARCHIVE
}

/** 将后端细阶段键映射为六步旅程键 */
export function resolveJourneyKeyByStage(stageKey: MarkStageKey): ExamJourneyKey {
  const step = EXAM_JOURNEY_STEPS.find((item) => item.stageKeys.includes(stageKey))
  if (!step) {
    throw new Error(`阶段 ${stageKey} 未配置考试旅程映射`)
  }
  return step.key
}

export function resolveJourneyStep(journeyKey: ExamJourneyKey): ExamJourneyStepDef {
  const step = EXAM_JOURNEY_STEPS.find((item) => item.key === journeyKey)
  if (!step) {
    throw new Error(`未知考试旅程：${journeyKey}`)
  }
  return step
}

/** 顶部旅程轨点击结构默认入口；扫描智能落点由 nextAction START_SCAN / 入口合同决议，不在此分流 */
export function resolveJourneyDefaultRoute(
  journeyKey: ExamJourneyKey,
  examId: string,
): RouteLocationRaw {
  return {
    name: resolveJourneyStep(journeyKey).defaultRouteName,
    params: { examId },
  }
}
