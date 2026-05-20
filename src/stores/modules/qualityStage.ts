/**
 * 质量评价阶段状态 Store
 *
 * 设计目标：跨页面共享当前业务对象（专业大类 / 培养方案 / 课程 / 学年）
 * 在质量评价主链上的阶段推进状态，让 StageRail 组件能在跨页面切换时
 * 保留正确的"当前阶段"状态，避免每个页面单独保存进度判断逻辑。
 *
 * 与 useQualityStore 的关系：
 * - useQualityStore 负责"当前业务对象上下文"（programId / planId / courseId）。
 * - useQualityStageStore 负责该业务对象的"阶段推进位置"。
 * - 业务对象切换时（setProgram / setTrainingPlan / setQualityCourse），
 *   阶段状态需要随之 reset，避免串数据。
 *
 * 阶段定义：质量评价主链按设计文档 "8. 工作台骨架" 描述：
 *   PROGRAM_PROFILE → TRAINING_PLAN → QUALITY_COURSE
 *   → SCORE_BATCH → ACHIEVEMENT → REPORT → IMPROVEMENT → ARCHIVE
 */
import type { WorkbenchStageStatus } from '@/types/workbench'
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

export type QualityStageKey =
  | 'PROGRAM_PROFILE'
  | 'TRAINING_PLAN'
  | 'QUALITY_COURSE'
  | 'SCORE_BATCH'
  | 'ACHIEVEMENT'
  | 'REPORT'
  | 'IMPROVEMENT'
  | 'ARCHIVE'

export interface QualityStageProgress {
  /** 当前阶段 key */
  current: QualityStageKey
  /** 各阶段状态：active / completed / pending / blocked */
  states: Record<QualityStageKey, WorkbenchStageStatus>
  /** 各阶段的提示文本（供 StageRail 副标题展示） */
  hints: Record<QualityStageKey, string>
  /** 阻断原因（仅当任一阶段为 blocked 时设置） */
  blockedReason: string
}

const ORDERED_STAGES: QualityStageKey[] = [
  'PROGRAM_PROFILE',
  'TRAINING_PLAN',
  'QUALITY_COURSE',
  'SCORE_BATCH',
  'ACHIEVEMENT',
  'REPORT',
  'IMPROVEMENT',
  'ARCHIVE',
]

const STAGE_TITLES: Record<QualityStageKey, string> = {
  PROGRAM_PROFILE: '专业评价口径',
  TRAINING_PLAN: '培养方案',
  QUALITY_COURSE: '质量评价课程',
  SCORE_BATCH: '成绩批次',
  ACHIEVEMENT: '达成度',
  REPORT: '评价报告',
  IMPROVEMENT: '改进闭环',
  ARCHIVE: '归档',
}

function emptyStates(): Record<QualityStageKey, WorkbenchStageStatus> {
  return ORDERED_STAGES.reduce((acc, key) => {
    acc[key] = 'pending'
    return acc
  }, {} as Record<QualityStageKey, WorkbenchStageStatus>)
}

function emptyHints(): Record<QualityStageKey, string> {
  return {
    PROGRAM_PROFILE: '',
    TRAINING_PLAN: '',
    QUALITY_COURSE: '',
    SCORE_BATCH: '',
    ACHIEVEMENT: '',
    REPORT: '',
    IMPROVEMENT: '',
    ARCHIVE: '',
  }
}

export const useQualityStageStore = defineStore('qualityStage', () => {
  const progress = reactive<QualityStageProgress>({
    current: 'PROGRAM_PROFILE',
    states: emptyStates(),
    hints: emptyHints(),
    blockedReason: '',
  })

  const orderedStages = computed(() => ORDERED_STAGES.map((key) => ({
    key,
    title: STAGE_TITLES[key],
    status: progress.states[key],
    statusText: progress.hints[key] || undefined,
  })))

  const hasBlocked = computed(() => Object.values(progress.states).some((s) => s === 'blocked'))

  /** 设置当前阶段；不会改变其他阶段状态 */
  function setCurrentStage(key: QualityStageKey): void {
    progress.current = key
  }

  /** 单阶段状态更新；可附带 hint 文本 */
  function setStageStatus(key: QualityStageKey, status: WorkbenchStageStatus, hint?: string): void {
    progress.states[key] = status
    if (hint !== undefined) progress.hints[key] = hint
    if (status === 'blocked' && hint) progress.blockedReason = hint
    else if (status !== 'blocked' && progress.blockedReason && progress.hints[key] === progress.blockedReason) {
      progress.blockedReason = ''
    }
  }

  /** 批量更新各阶段状态（业务页面 onMounted 一次性同步） */
  function bulkUpdate(updates: Partial<Record<QualityStageKey, { status: WorkbenchStageStatus, hint?: string }>>): void {
    for (const key of Object.keys(updates) as QualityStageKey[]) {
      const update = updates[key]
      if (!update) continue
      progress.states[key] = update.status
      if (update.hint !== undefined) progress.hints[key] = update.hint
    }
  }

  function reset(): void {
    progress.current = 'PROGRAM_PROFILE'
    progress.states = emptyStates()
    progress.hints = emptyHints()
    progress.blockedReason = ''
  }

  return {
    progress,
    orderedStages,
    hasBlocked,
    setCurrentStage,
    setStageStatus,
    bulkUpdate,
    reset,
  }
})

export const QUALITY_STAGE_KEYS: ReadonlyArray<QualityStageKey> = ORDERED_STAGES
export const QUALITY_STAGE_TITLES: Readonly<Record<QualityStageKey, string>> = STAGE_TITLES
